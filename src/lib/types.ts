/**
 * Domain types shared between server (providers, API routes) and client
 * (React components). These shapes are what the API returns — they never
 * contain credentials or raw AWS SDK objects.
 */
import type { TimeRangeKey } from "@/lib/time-ranges";

export const INSTANCE_STATES = [
  "pending",
  "running",
  "stopping",
  "stopped",
  "shutting-down",
  "terminated",
] as const;
export type InstanceState = (typeof INSTANCE_STATES)[number];

export const TRANSITIONAL_STATES: InstanceState[] = ["pending", "stopping", "shutting-down"];

/**
 * Where an instance's data comes from. Every instance carries its source, and
 * (source, instanceId) is the unique key: the same ID can never be confused
 * between generated demo data and your real AWS account.
 */
export const DATA_SOURCES = ["AWS", "MOCK"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

/** Lowercase form used in URLs: /instances/aws/i-0abc... */
export type DataSourceSlug = Lowercase<DataSource>;
export const DATA_SOURCE_SLUGS = ["aws", "mock"] as const satisfies readonly DataSourceSlug[];

export function sourceSlug(source: DataSource): DataSourceSlug {
  return source.toLowerCase() as DataSourceSlug;
}

/** Which sources the server combines, from MONITORING_PROVIDER. */
export type MonitoringMode = "HYBRID" | "MOCK" | "AWS";

/** Result of asking one source for its instances. Shown in the UI so failures are never silent. */
export interface SourceStatus {
  source: DataSource;
  ok: boolean;
  /** Non-terminated instances returned by this source, or null when it failed. */
  instanceCount: number | null;
  error: { code: string; message: string } | null;
}

/** EC2 status check result. "not-applicable" when the instance isn't running. */
export type StatusCheck = "ok" | "impaired" | "initializing" | "insufficient-data" | "not-applicable";

export interface Ec2Instance {
  source: DataSource;
  instanceId: string;
  name: string | null;
  instanceType: string;
  region: string;
  availabilityZone: string | null;
  state: InstanceState;
  publicIp: string | null;
  privateIp: string | null;
  launchTime: string | null; // ISO 8601
  platform: string | null;
  architecture: string | null;
  vpcId: string | null;
  subnetId: string | null;
  imageId: string | null;
  keyName: string | null;
  monitoring: "basic" | "detailed";
  systemStatus: StatusCheck;
  instanceStatus: StatusCheck;
  tags: Record<string, string>;
}

export type OverallStatus = "operational" | "degraded" | "transitioning" | "no-instances";

export interface InfrastructureSummary {
  region: string;
  total: number;
  running: number;
  stopped: number;
  transitional: number;
  terminated: number;
  impaired: number;
  overallStatus: OverallStatus;
  attention: Pick<Ec2Instance, "source" | "instanceId" | "name" | "state" | "systemStatus" | "instanceStatus">[];
  sources: SourceStatus[];
  generatedAt: string;
}

export type MetricKey =
  | "cpu"
  | "networkIn"
  | "networkOut"
  | "diskReadOps"
  | "diskWriteOps"
  | "memory"
  | "diskUsage";

export type MetricUnit = "percent" | "bytesPerSecond" | "opsPerSecond";

/**
 * - ok:             datapoints were returned
 * - no_data:        the metric exists conceptually but CloudWatch returned nothing
 * - agent_required: metric is only published by the CloudWatch Agent, which
 *                   isn't reporting for this instance
 */
export type MetricStatus = "ok" | "no_data" | "agent_required";

export interface MetricDatapoint {
  t: string; // ISO timestamp
  v: number;
}

export interface MetricSeries {
  key: MetricKey;
  label: string;
  description: string;
  unit: MetricUnit;
  /** "EC2" = standard AWS/EC2 namespace, "CWAgent" = CloudWatch Agent namespace. */
  source: "EC2" | "CWAgent";
  status: MetricStatus;
  datapoints: MetricDatapoint[];
}

export interface InstanceMetrics {
  source: DataSource;
  instanceId: string;
  range: TimeRangeKey;
  /** Actual period used. AWS instances with basic monitoring never go below 300s. */
  periodSec: number;
  start: string;
  end: string;
  series: MetricSeries[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  ipAddress: string | null;
  user: { name: string; email: string } | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
