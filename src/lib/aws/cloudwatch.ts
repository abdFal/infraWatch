import "server-only";
import {
  GetMetricDataCommand,
  ListMetricsCommand,
  type Dimension,
  type MetricDataQuery,
  type MetricDataResult,
} from "@aws-sdk/client-cloudwatch";
import { METRIC_DEFINITIONS, type MetricDefinition } from "@/lib/metric-definitions";
import { getTimeRange, type TimeRangeKey } from "@/lib/time-ranges";
import type { Ec2Instance, InstanceMetrics, MetricDatapoint, MetricKey, MetricSeries } from "@/lib/types";
import { callOptions, getAwsClients } from "./client";

/**
 * Read-only CloudWatch calls. Only two APIs are used:
 *   cloudwatch:GetMetricData  all time series for one instance, in one request
 *   cloudwatch:ListMetrics    find the CloudWatch Agent metrics for an instance
 *
 * Nothing here ever invents a value: if CloudWatch returns no datapoints the
 * series is marked "no_data", and if the agent never published a metric it is
 * marked "agent_required".
 */

const MAX_PAGES = 10;

// ---------------------------------------------------------------------------
// CloudWatch Agent metric discovery
// ---------------------------------------------------------------------------

/**
 * The agent's metrics carry extra dimensions that depend on its config
 * (e.g. ImageId, InstanceType, and path/device/fstype for disks).
 * GetMetricData needs the EXACT dimension set, so we look them up with
 * ListMetrics (which covers the last two weeks) instead of guessing.
 */
const AGENT_LOOKUP_TTL_MS = 5 * 60_000;
const agentLookupCache = new Map<string, { at: number; dims: Partial<Record<MetricKey, Dimension[]>> }>();

async function findAgentMetrics(region: string, instanceId: string) {
  const cacheKey = `${region}:${instanceId}`;
  const cached = agentLookupCache.get(cacheKey);
  if (cached && Date.now() - cached.at < AGENT_LOOKUP_TTL_MS) return cached.dims;

  const { cloudwatch } = getAwsClients(region);
  const found: { name: string; dims: Dimension[] }[] = [];
  let nextToken: string | undefined;
  let pages = 0;
  do {
    const response = await cloudwatch.send(
      new ListMetricsCommand({
        Namespace: "CWAgent",
        Dimensions: [{ Name: "InstanceId", Value: instanceId }],
        NextToken: nextToken,
      }),
      callOptions(),
    );
    for (const metric of response.Metrics ?? []) {
      if (metric.MetricName) found.push({ name: metric.MetricName, dims: metric.Dimensions ?? [] });
    }
    nextToken = response.NextToken;
    pages++;
  } while (nextToken && pages < MAX_PAGES);

  const fewestDims = (a: { dims: Dimension[] }, b: { dims: Dimension[] }) => a.dims.length - b.dims.length;
  const memory = found.filter((m) => m.name === "mem_used_percent").sort(fewestDims)[0];
  const disks = found.filter((m) => m.name === "disk_used_percent").sort(fewestDims);
  const rootDisk = disks.find((m) => m.dims.some((d) => d.Name === "path" && d.Value === "/")) ?? disks[0];

  const dims: Partial<Record<MetricKey, Dimension[]>> = {};
  if (memory) dims.memory = memory.dims;
  if (rootDisk) dims.diskUsage = rootDisk.dims;
  agentLookupCache.set(cacheKey, { at: Date.now(), dims });
  return dims;
}

// ---------------------------------------------------------------------------
// GetMetricData
// ---------------------------------------------------------------------------

async function getMetricData(region: string, queries: MetricDataQuery[], start: Date, end: Date) {
  const { cloudwatch } = getAwsClients(region);
  const results = new Map<string, MetricDataResult>();
  let nextToken: string | undefined;
  let pages = 0;
  do {
    const response = await cloudwatch.send(
      new GetMetricDataCommand({
        MetricDataQueries: queries,
        StartTime: start,
        EndTime: end,
        ScanBy: "TimestampAscending",
        NextToken: nextToken,
      }),
      callOptions(),
    );
    // A long series can be split across pages: append to what we already have.
    for (const result of response.MetricDataResults ?? []) {
      if (!result.Id) continue;
      const existing = results.get(result.Id);
      if (existing) {
        existing.Timestamps = [...(existing.Timestamps ?? []), ...(result.Timestamps ?? [])];
        existing.Values = [...(existing.Values ?? []), ...(result.Values ?? [])];
      } else {
        results.set(result.Id, { ...result });
      }
    }
    nextToken = response.NextToken;
    pages++;
  } while (nextToken && pages < MAX_PAGES);
  return results;
}

function toDatapoints(result: MetricDataResult | undefined, def: MetricDefinition, periodSec: number): MetricDatapoint[] {
  const timestamps = result?.Timestamps ?? [];
  const values = result?.Values ?? [];
  const points: MetricDatapoint[] = [];
  for (let i = 0; i < Math.min(timestamps.length, values.length); i++) {
    // Sum over a period -> rate per second, so 1h and 24h views use the same scale.
    const value = def.perSecond ? values[i] / periodSec : values[i];
    points.push({ t: new Date(timestamps[i]).toISOString(), v: Math.round(value * 100) / 100 });
  }
  return points.sort((a, b) => a.t.localeCompare(b.t));
}

export async function getEc2InstanceMetrics(
  region: string,
  instance: Ec2Instance,
  rangeKey: TimeRangeKey,
): Promise<InstanceMetrics> {
  const range = getTimeRange(rangeKey);
  // Basic monitoring only stores 5-minute data. Asking for 1-minute periods would
  // return one datapoint every 5 minutes, and dividing those Sums by 60 would
  // overstate network/disk rates 5x. So never go below 300s for basic monitoring.
  const periodSec = instance.monitoring === "detailed" ? range.periodSec : Math.max(range.periodSec, 300);

  const periodMs = periodSec * 1000;
  const end = new Date(Math.floor(Date.now() / periodMs) * periodMs);
  const start = new Date(end.getTime() - range.hours * 3_600_000);

  const agentDims = await findAgentMetrics(region, instance.instanceId);

  const queries: MetricDataQuery[] = [];
  for (const def of METRIC_DEFINITIONS) {
    const dimensions =
      def.namespace === "AWS/EC2" ? [{ Name: "InstanceId", Value: instance.instanceId }] : agentDims[def.key];
    if (!dimensions) continue; // agent metric that was never published -> "agent_required"
    queries.push({
      Id: def.key, // must start with a lowercase letter: "cpu", "networkIn", ...
      MetricStat: {
        Metric: { Namespace: def.namespace, MetricName: def.metricName, Dimensions: dimensions },
        Period: periodSec,
        Stat: def.statistic,
      },
      ReturnData: true,
    });
  }

  const results = await getMetricData(region, queries, start, end);

  const series: MetricSeries[] = METRIC_DEFINITIONS.map((def) => {
    const base = {
      key: def.key,
      label: def.label,
      description: def.description,
      unit: def.unit,
      source: def.source,
    };
    if (def.namespace === "CWAgent" && !agentDims[def.key]) {
      return { ...base, status: "agent_required", datapoints: [] };
    }
    const datapoints = toDatapoints(results.get(def.key), def, periodSec);
    return { ...base, status: datapoints.length > 0 ? "ok" : "no_data", datapoints };
  });

  return {
    source: "AWS",
    instanceId: instance.instanceId,
    range: rangeKey,
    periodSec,
    start: start.toISOString(),
    end: end.toISOString(),
    series,
  };
}
