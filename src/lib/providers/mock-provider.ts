import "server-only";
import { METRIC_DEFINITIONS, type MetricDefinition } from "@/lib/metric-definitions";
import { getTimeRange, type TimeRangeKey } from "@/lib/time-ranges";
import type {
  Ec2Instance,
  InstanceMetrics,
  InstanceState,
  MetricDatapoint,
  MetricSeries,
  StatusCheck,
} from "@/lib/types";
import type { MonitoringProvider } from "./monitoring-provider";

/**
 * MOCK provider — for local development without an AWS account.
 *
 * Data is deterministic: the same region always yields the same instances, and a
 * metric value for a given instance + timestamp is always the same, so charts
 * stay stable across refreshes and only grow at the right edge.
 *
 * It intentionally reproduces real CloudWatch behaviour that the UI must handle:
 *   - stopped / pending instances have no recent datapoints  -> "no_data"
 *   - memory & disk usage only exist where the CloudWatch Agent is installed
 *                                                             -> "agent_required"
 *   - DiskRead/WriteOps are empty on EBS-only Nitro instances -> "no_data"
 *
 * Public IPs use the RFC 5737 documentation ranges (203.0.113.0/24,
 * 198.51.100.0/24), which never route on the internet.
 */

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

function hashString(input: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic value in [0, 1) for a string key. */
function unit(key: string) {
  return hashString(key) / 4294967296;
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function hex(rand: () => number, length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(rand() * 16).toString(16);
  return out;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Fleet generation
// ---------------------------------------------------------------------------

interface MockInstance extends Ec2Instance {
  /** Whether the CloudWatch Agent publishes memory/disk metrics. */
  hasAgent: boolean;
  /** Typical CPU load (0-100) the metric generator centres on. */
  cpuBaseline: number;
}

const ROLES = [
  { name: "web-prod", types: ["t3.medium", "t3.large", "m6i.large"], cpu: 35, env: "production" },
  { name: "api-prod", types: ["m6i.large", "c6i.xlarge", "m5.large"], cpu: 45, env: "production" },
  { name: "worker-batch", types: ["c5d.xlarge", "c6i.2xlarge"], cpu: 70, env: "production" },
  { name: "cache-node", types: ["r6i.large", "r5.large"], cpu: 20, env: "production" },
  { name: "db-replica", types: ["r5d.large", "m5d.xlarge"], cpu: 30, env: "production" },
  { name: "web-staging", types: ["t3.small", "t2.medium"], cpu: 12, env: "staging" },
  { name: "api-staging", types: ["t3.medium", "t2.large"], cpu: 15, env: "staging" },
  { name: "ci-runner", types: ["c6i.large", "c5.xlarge"], cpu: 55, env: "tooling" },
  { name: "monitoring", types: ["t3.medium"], cpu: 25, env: "tooling" },
  { name: "bastion", types: ["t3.micro", "t2.micro"], cpu: 3, env: "tooling" },
] as const;

/** Anchor launch times to the start of the current UTC day so they're stable within a day. */
function dayAnchor() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function generateFleet(region: string): MockInstance[] {
  const rand = mulberry32(hashString(`fleet:${region}`));
  const count = 14 + Math.floor(rand() * 9); // 14-22 instances
  const anchor = dayAnchor();
  const zones = ["a", "b", "c"];
  const instances: MockInstance[] = [];
  const roleCounters = new Map<string, number>();

  for (let i = 0; i < count; i++) {
    const role = ROLES[i % ROLES.length];
    const n = (roleCounters.get(role.name) ?? 0) + 1;
    roleCounters.set(role.name, n);

    // State mix: mostly running, some stopped, a few transitional/terminated.
    let state: InstanceState = "running";
    const roll = rand();
    if (i === 3) state = "pending";
    else if (i === 8) state = "stopping";
    else if (i === count - 1) state = "terminated";
    else if (roll < 0.2) state = "stopped";

    const instanceType = pick(rand, role.types);
    const isRunning = state === "running";
    const hasPublicIp = isRunning && (role.name.startsWith("web") || role.name === "bastion");
    const launchedDaysAgo = 1 + Math.floor(rand() * 180);
    const launchedHoursAgo = Math.floor(rand() * 24);

    let systemStatus: StatusCheck = "not-applicable";
    let instanceStatus: StatusCheck = "not-applicable";
    if (isRunning) {
      systemStatus = "ok";
      instanceStatus = i === 5 ? "impaired" : "ok"; // one unhealthy instance to show alerts
    } else if (state === "pending") {
      systemStatus = "initializing";
      instanceStatus = "initializing";
    }

    const name = `${role.name}-${String(n).padStart(2, "0")}`;
    instances.push({
      instanceId: `i-0${hex(rand, 16)}`,
      name: i === 11 ? null : name, // one untagged instance, as happens in real accounts
      instanceType,
      region,
      availabilityZone: `${region}${zones[i % zones.length]}`,
      state,
      publicIp: hasPublicIp
        ? `${pick(rand, ["203.0.113", "198.51.100"])}.${10 + Math.floor(rand() * 240)}`
        : null,
      privateIp: state === "terminated" ? null : `10.0.${i % 3}.${10 + Math.floor(rand() * 240)}`,
      launchTime:
        state === "stopped" || state === "terminated"
          ? new Date(anchor - (launchedDaysAgo + 30) * 86_400_000).toISOString()
          : new Date(anchor - launchedDaysAgo * 86_400_000 - launchedHoursAgo * 3_600_000).toISOString(),
      platform: role.name === "ci-runner" && n === 2 ? "windows" : "Linux/UNIX",
      architecture: instanceType.startsWith("m6i") || instanceType.startsWith("c6i") ? "x86_64" : pick(rand, ["x86_64", "arm64"]),
      vpcId: `vpc-0${hex(mulberry32(hashString(`vpc:${region}`)), 16)}`,
      subnetId: `subnet-0${hex(mulberry32(hashString(`subnet:${region}:${i % 3}`)), 16)}`,
      imageId: `ami-0${hex(rand, 16)}`,
      keyName: role.env === "production" ? "prod-ops" : "dev-ops",
      monitoring: role.env === "production" ? "detailed" : "basic",
      systemStatus,
      instanceStatus,
      tags: {
        ...(i === 11 ? {} : { Name: name }),
        Environment: role.env,
        Team: role.env === "tooling" ? "platform" : "product",
        ManagedBy: "terraform",
      },
      hasAgent: role.env === "production" && rand() > 0.25,
      cpuBaseline: role.cpu,
    });
  }
  return instances;
}

const fleetCache = new Map<string, { day: number; fleet: MockInstance[] }>();

function getFleet(region: string) {
  const day = dayAnchor();
  const cached = fleetCache.get(region);
  if (cached && cached.day === day) return cached.fleet;
  const fleet = generateFleet(region);
  fleetCache.set(region, { day, fleet });
  return fleet;
}

function toPublic(instance: MockInstance): Ec2Instance {
  // Strip mock-only fields so the API shape matches the AWS provider exactly.
  const { hasAgent: _hasAgent, cpuBaseline: _cpuBaseline, ...rest } = instance;
  void _hasAgent;
  void _cpuBaseline;
  return rest;
}

// ---------------------------------------------------------------------------
// Metric generation
// ---------------------------------------------------------------------------

/** Instance types whose DiskRead/WriteOps are reported by AWS/EC2 (Xen or instance-store). */
function reportsDiskOps(instanceType: string) {
  const family = instanceType.split(".")[0];
  return family.startsWith("t2") || /\d[a-z]*d$/.test(family);
}

function wave(instanceId: string, metric: string, tMs: number) {
  const seed = unit(`${instanceId}:${metric}`);
  const hours = tMs / 3_600_000;
  // Daily cycle + a faster ripple + per-bucket jitter, all deterministic.
  const daily = Math.sin((hours / 24) * 2 * Math.PI + seed * 6.28);
  const ripple = Math.sin(hours * 2.3 + seed * 12.1) * 0.35;
  const jitter = (unit(`${instanceId}:${metric}:${Math.floor(tMs / 60_000)}`) - 0.5) * 0.6;
  return daily + ripple + jitter; // roughly -2 .. 2
}

function valueFor(def: MetricDefinition, instance: MockInstance, tMs: number): number {
  const w = wave(instance.instanceId, def.key, tMs);
  const clampPct = (v: number) => Math.min(100, Math.max(0, v));
  switch (def.key) {
    case "cpu":
      return clampPct(instance.cpuBaseline + w * (instance.cpuBaseline * 0.35 + 3));
    case "networkIn":
      return Math.max(0, (instance.cpuBaseline * 9_000 + 20_000) * (1 + w * 0.4));
    case "networkOut":
      return Math.max(0, (instance.cpuBaseline * 12_000 + 15_000) * (1 + w * 0.45));
    case "diskReadOps":
      return Math.max(0, (instance.cpuBaseline * 0.8 + 2) * (1 + w * 0.5));
    case "diskWriteOps":
      return Math.max(0, (instance.cpuBaseline * 1.2 + 3) * (1 + w * 0.5));
    case "memory":
      return clampPct(45 + unit(`${instance.instanceId}:membase`) * 30 + w * 6);
    case "diskUsage": {
      // Grows slowly over time, like a real filesystem.
      const base = 30 + unit(`${instance.instanceId}:diskbase`) * 40;
      const growth = ((tMs / 86_400_000) % 30) * 0.15;
      return clampPct(base + growth + w * 0.3);
    }
  }
}

function buildSeries(
  def: MetricDefinition,
  instance: MockInstance,
  timestamps: number[],
): MetricSeries {
  const base = {
    key: def.key,
    label: def.label,
    description: def.description,
    unit: def.unit,
    source: def.source,
  };

  if (def.source === "CWAgent" && !instance.hasAgent) {
    return { ...base, status: "agent_required", datapoints: [] };
  }
  if (instance.state !== "running") {
    return { ...base, status: "no_data", datapoints: [] };
  }
  if ((def.key === "diskReadOps" || def.key === "diskWriteOps") && !reportsDiskOps(instance.instanceType)) {
    return { ...base, status: "no_data", datapoints: [] };
  }

  const datapoints: MetricDatapoint[] = timestamps.map((t) => ({
    t: new Date(t).toISOString(),
    v: Math.round(valueFor(def, instance, t) * 100) / 100,
  }));
  return { ...base, status: "ok", datapoints };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class MockMonitoringProvider implements MonitoringProvider {
  readonly mode = "MOCK" as const;

  /** Small artificial latency so loading states are visible during development. */
  private async latency() {
    await sleep(120 + Math.floor(Math.random() * 250));
  }

  async listInstances(region: string): Promise<Ec2Instance[]> {
    await this.latency();
    return getFleet(region).map(toPublic);
  }

  async getInstance(region: string, instanceId: string): Promise<Ec2Instance | null> {
    await this.latency();
    const found = getFleet(region).find((i) => i.instanceId === instanceId);
    return found ? toPublic(found) : null;
  }

  async getInstanceMetrics(
    region: string,
    instance: Ec2Instance,
    rangeKey: TimeRangeKey,
  ): Promise<InstanceMetrics> {
    await this.latency();
    const range = getTimeRange(rangeKey);
    const mock = getFleet(region).find((i) => i.instanceId === instance.instanceId);
    const periodMs = range.periodSec * 1000;

    // CloudWatch publishes with a short delay, so the newest point is one period back.
    const end = Math.floor(Date.now() / periodMs) * periodMs - periodMs;
    const start = end - range.hours * 3_600_000;
    const timestamps: number[] = [];
    for (let t = start + periodMs; t <= end; t += periodMs) timestamps.push(t);

    const series = METRIC_DEFINITIONS.map((def) =>
      mock
        ? buildSeries(def, mock, timestamps)
        : {
            key: def.key,
            label: def.label,
            description: def.description,
            unit: def.unit,
            source: def.source,
            status: "no_data" as const,
            datapoints: [],
          },
    );

    return {
      instanceId: instance.instanceId,
      range: rangeKey,
      periodSec: range.periodSec,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      series,
    };
  }
}
