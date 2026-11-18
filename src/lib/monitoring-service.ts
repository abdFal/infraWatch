import "server-only";
import { logActivity } from "@/lib/activity";
import { getMonitoringProvider, ProviderError } from "@/lib/providers";
import { getActiveRegion } from "@/lib/settings";
import type { TimeRangeKey } from "@/lib/time-ranges";
import {
  TRANSITIONAL_STATES,
  type Ec2Instance,
  type InfrastructureSummary,
  type InstanceMetrics,
  type InstanceState,
  type OverallStatus,
  type Paginated,
} from "@/lib/types";

/**
 * Application-level monitoring logic that sits between API routes and the
 * provider: region selection, short-lived caching, search/filter/pagination,
 * summary calculations and error logging. It is provider-agnostic.
 */

const LIST_CACHE_TTL_MS = 15_000;
const listCache = new Map<string, { at: number; data: Ec2Instance[] }>();
const lastErrorLogged = new Map<string, number>();

async function withProviderErrorLogging<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError("UNAVAILABLE", "The monitoring provider is currently unavailable.", { cause: error });

    console.error(`[monitoring] ${operation} failed`, error);

    // Log at most once per minute per error code, to keep the activity log readable.
    const now = Date.now();
    if (now - (lastErrorLogged.get(providerError.code) ?? 0) > 60_000) {
      lastErrorLogged.set(providerError.code, now);
      await logActivity({
        action: "PROVIDER_ERROR",
        description: `${operation}: ${providerError.message}`,
        metadata: { code: providerError.code },
      });
    }
    throw providerError;
  }
}

async function listAll(region: string): Promise<Ec2Instance[]> {
  const provider = getMonitoringProvider();
  const key = `${provider.mode}:${region}`;
  const cached = listCache.get(key);
  if (cached && Date.now() - cached.at < LIST_CACHE_TTL_MS) return cached.data;

  const data = await withProviderErrorLogging("List instances", () => provider.listInstances(region));
  listCache.set(key, { at: Date.now(), data });
  return data;
}

export async function getSummary(): Promise<InfrastructureSummary> {
  const region = await getActiveRegion();
  const instances = await listAll(region);
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
    .map(({ instanceId, name, state, systemStatus, instanceStatus }) => ({
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
    generatedAt: new Date().toISOString(),
  };
}

export interface InstanceQuery {
  page: number;
  pageSize: number;
  search?: string;
  state?: InstanceState | "transitional";
}

export async function searchInstances(query: InstanceQuery): Promise<Paginated<Ec2Instance> & { region: string }> {
  const region = await getActiveRegion();
  let items = await listAll(region);

  if (query.state === "transitional") items = items.filter((i) => TRANSITIONAL_STATES.includes(i.state));
  else if (query.state) items = items.filter((i) => i.state === query.state);
  if (query.search) {
    const needle = query.search.toLowerCase();
    items = items.filter(
      (i) => i.instanceId.toLowerCase().includes(needle) || (i.name ?? "").toLowerCase().includes(needle),
    );
  }

  // Stable order: by name (unnamed last), then id.
  items = [...items].sort((a, b) => {
    if (a.name && !b.name) return -1;
    if (!a.name && b.name) return 1;
    return (a.name ?? "").localeCompare(b.name ?? "") || a.instanceId.localeCompare(b.instanceId);
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.pageSize;

  return {
    region,
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
  const items = await listAll(region);
  return items
    .filter((i) => i.state !== "terminated")
    .sort((a, b) => (a.name ?? "\uffff").localeCompare(b.name ?? "\uffff") || a.instanceId.localeCompare(b.instanceId))
    .map(({ instanceId, name, state, instanceType }) => ({ instanceId, name, state, instanceType }));
}

export async function getInstanceDetail(instanceId: string) {
  const region = await getActiveRegion();
  const provider = getMonitoringProvider();
  return withProviderErrorLogging("Get instance", () => provider.getInstance(region, instanceId));
}

export async function getInstanceMetrics(
  instanceId: string,
  range: TimeRangeKey,
): Promise<InstanceMetrics | null> {
  const region = await getActiveRegion();
  const provider = getMonitoringProvider();
  const instance = await withProviderErrorLogging("Get instance", () => provider.getInstance(region, instanceId));
  if (!instance) return null;
  return withProviderErrorLogging("Get metrics", () => provider.getInstanceMetrics(region, instance, range));
}

/** Drop cached lists, e.g. after the region changes. */
export function clearInstanceCache() {
  listCache.clear();
}
