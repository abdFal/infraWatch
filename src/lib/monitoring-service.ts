import "server-only";
import { logActivity } from "@/lib/activity";
import { getEnabledSources, getProvider, isSourceEnabled, ProviderError } from "@/lib/providers";
import { getActiveRegion } from "@/lib/settings";
import type { TimeRangeKey } from "@/lib/time-ranges";
import {
  TRANSITIONAL_STATES,
  type DataSource,
  type Ec2Instance,
  type InfrastructureSummary,
  type InstanceMetrics,
  type InstanceState,
  type OverallStatus,
  type Paginated,
  type SourceStatus,
} from "@/lib/types";

/**
 * The unified monitoring service. API routes call only this module; it:
 *   - asks every enabled source (AWS and/or MOCK) for its instances in parallel
 *   - merges them, keyed by (source, instanceId), so nothing is duplicated
 *   - reports each source's status, so a failing source is visible, not hidden
 *   - caches lists briefly, searches, filters, paginates and summarises
 *   - routes detail/metrics requests to the provider that owns the instance
 */

const LIST_CACHE_TTL_MS = 15_000;
/** Cached per source+region. Failures are cached too, so a broken AWS setup isn't retried on every request. */
const listCache = new Map<string, { at: number; promise: Promise<Ec2Instance[]> }>();
const lastErrorLogged = new Map<string, number>();

function asProviderError(error: unknown): ProviderError {
  return error instanceof ProviderError
    ? error
    : new ProviderError("UNAVAILABLE", "The monitoring provider is currently unavailable.", { cause: error });
}

async function reportProviderError(source: DataSource, operation: string, error: unknown): Promise<ProviderError> {
  const providerError = asProviderError(error);
  // Full details (including the raw AWS message) go to the server log only.
  console.error(`[monitoring] ${source} ${operation} failed: ${providerError.code}`, providerError.cause ?? providerError);

  // Write to the activity log at most once per minute per source + error code.
  const key = `${source}:${providerError.code}`;
  const now = Date.now();
  if (now - (lastErrorLogged.get(key) ?? 0) > 60_000) {
    lastErrorLogged.set(key, now);
    await logActivity({
      action: "PROVIDER_ERROR",
      description: `${source} · ${operation}: ${providerError.message}`,
      metadata: { source, code: providerError.code },
    });
  }
  return providerError;
}

async function withErrorReporting<T>(source: DataSource, operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw await reportProviderError(source, operation, error);
  }
}

function listSource(source: DataSource, region: string): Promise<Ec2Instance[]> {
  const key = `${source}:${region}`;
  const cached = listCache.get(key);
  if (cached && Date.now() - cached.at < LIST_CACHE_TTL_MS) return cached.promise;

  // Store the promise (not the result) so concurrent requests share one AWS call.
  const promise = withErrorReporting(source, "List instances", () => getProvider(source).listInstances(region));
  promise.catch(() => {}); // handled by callers; avoids an unhandled-rejection warning for cached failures
  listCache.set(key, { at: Date.now(), promise });
  return promise;
}

interface CombinedList {
  instances: Ec2Instance[];
  sources: SourceStatus[];
}

/**
 * Instances from every enabled source. If one source fails, the others are still
 * returned and the failure is described in `sources`. Only when every source
 * fails is the error thrown (the API then answers with an error status).
 */
async function listAllSources(region: string): Promise<CombinedList> {
  const sources = getEnabledSources();
  const settled = await Promise.allSettled(sources.map((source) => listSource(source, region)));

  const byKey = new Map<string, Ec2Instance>();
  const statuses: SourceStatus[] = [];
  let firstError: ProviderError | undefined;

  settled.forEach((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      for (const instance of result.value) {
        // The key includes the source, so a mock ID can never shadow a real one.
        byKey.set(`${source}:${instance.instanceId}`, { ...instance, source });
      }
      statuses.push({
        source,
        ok: true,
        instanceCount: result.value.filter((i) => i.state !== "terminated").length,
        error: null,
      });
    } else {
      const error = asProviderError(result.reason);
      firstError ??= error;
      statuses.push({ source, ok: false, instanceCount: null, error: { code: error.code, message: error.message } });
    }
  });

  if (firstError && statuses.every((s) => !s.ok)) throw firstError;
  return { instances: [...byKey.values()], sources: statuses };
}

/** Real AWS instances first, then mock; within a source by name (unnamed last), then ID. */
function compareInstances(a: Ec2Instance, b: Ec2Instance) {
  if (a.source !== b.source) return a.source === "AWS" ? -1 : 1;
  if (a.name && !b.name) return -1;
  if (!a.name && b.name) return 1;
  return (a.name ?? "").localeCompare(b.name ?? "") || a.instanceId.localeCompare(b.instanceId);
}

export async function getSummary(): Promise<InfrastructureSummary> {
  const region = await getActiveRegion();
  const { instances, sources } = await listAllSources(region);
  const visible = instances.filter((i) => i.state !== "terminated");

  const count = (state: InstanceState) => instances.filter((i) => i.state === state).length;
  const transitional = instances.filter((i) => TRANSITIONAL_STATES.includes(i.state)).length;
  const impairedList = visible.filter(
    (i) => i.systemStatus === "impaired" || i.instanceStatus === "impaired",
  );

  let overallStatus: OverallStatus = "operational";
  if (visible.length === 0) overallStatus = "no-instances";
  else if (impairedList.length > 0) overallStatus = "degraded";
  else if (transitional > 0) overallStatus = "transitioning";

  const attention = visible
    .filter(
      (i) =>
        TRANSITIONAL_STATES.includes(i.state) ||
        i.systemStatus === "impaired" ||
        i.instanceStatus === "impaired",
    )
    .sort(compareInstances)
    .map(({ source, instanceId, name, state, systemStatus, instanceStatus }) => ({
      source,
      instanceId,
      name,
      state,
      systemStatus,
      instanceStatus,
    }));

  return {
    region,
    total: visible.length,
    running: count("running"),
    stopped: count("stopped"),
    transitional,
    terminated: count("terminated"),
    impaired: impairedList.length,
    overallStatus,
    attention,
    sources,
    generatedAt: new Date().toISOString(),
  };
}

export interface InstanceQuery {
  page: number;
  pageSize: number;
  search?: string;
  state?: InstanceState | "transitional";
  source?: DataSource;
}

export async function searchInstances(
  query: InstanceQuery,
): Promise<Paginated<Ec2Instance> & { region: string; sources: SourceStatus[] }> {
  const region = await getActiveRegion();
  const { instances, sources } = await listAllSources(region);
  let items = instances;

  if (query.source) items = items.filter((i) => i.source === query.source);
  if (query.state === "transitional") items = items.filter((i) => TRANSITIONAL_STATES.includes(i.state));
  else if (query.state) items = items.filter((i) => i.state === query.state);
  if (query.search) {
    const needle = query.search.toLowerCase();
    items = items.filter(
      (i) => i.instanceId.toLowerCase().includes(needle) || (i.name ?? "").toLowerCase().includes(needle),
    );
  }

  items = [...items].sort(compareInstances);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.pageSize;

  return {
    region,
    sources,
    items: items.slice(start, start + query.pageSize),
    page,
    pageSize: query.pageSize,
    total,
    totalPages,
  };
}

/** Lightweight list for pickers (e.g. the Monitoring page instance selector). */
export async function listInstanceOptions() {
  const region = await getActiveRegion();
  const { instances, sources } = await listAllSources(region);
  const items = instances
    .filter((i) => i.state !== "terminated")
    .sort(compareInstances)
    .map(({ source, instanceId, name, state, instanceType }) => ({ source, instanceId, name, state, instanceType }));
  return { items, sources };
}

/** One instance from the source that owns it. null = not found (or that source is disabled). */
export async function getInstanceDetail(source: DataSource, instanceId: string) {
  if (!isSourceEnabled(source)) return null;
  const region = await getActiveRegion();
  return withErrorReporting(source, "Get instance", () => getProvider(source).getInstance(region, instanceId));
}

export async function getInstanceMetrics(
  source: DataSource,
  instanceId: string,
  range: TimeRangeKey,
): Promise<InstanceMetrics | null> {
  const instance = await getInstanceDetail(source, instanceId);
  if (!instance) return null;
  const region = await getActiveRegion();
  return withErrorReporting(source, "Get metrics", () => getProvider(source).getInstanceMetrics(region, instance, range));
}

/** Drop cached lists, e.g. after the region changes. */
export function clearInstanceCache() {
  listCache.clear();
}
