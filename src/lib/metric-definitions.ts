import type { MetricKey, MetricSeries } from "@/lib/types";

/**
 * The metrics this dashboard shows, and where each one comes from.
 *
 * Standard EC2 metrics (namespace AWS/EC2) exist for every instance.
 * Memory and filesystem usage are NOT collected by EC2: they appear only after
 * the CloudWatch Agent is installed on the instance (namespace CWAgent).
 */
export interface MetricDefinition {
  key: MetricKey;
  label: string;
  description: string;
  unit: MetricSeries["unit"];
  source: MetricSeries["source"];
  namespace: "AWS/EC2" | "CWAgent";
  metricName: string;
  statistic: "Average" | "Sum";
  /** Divide Sum by the period to show a per-second rate. */
  perSecond: boolean;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: "cpu",
    label: "CPU Utilization",
    description: "Average CPU utilization across all vCPUs.",
    unit: "percent",
    source: "EC2",
    namespace: "AWS/EC2",
    metricName: "CPUUtilization",
    statistic: "Average",
    perSecond: false,
  },
  {
    key: "networkIn",
    label: "Network In",
    description: "Bytes received on all network interfaces.",
    unit: "bytesPerSecond",
    source: "EC2",
    namespace: "AWS/EC2",
    metricName: "NetworkIn",
    statistic: "Sum",
    perSecond: true,
  },
  {
    key: "networkOut",
    label: "Network Out",
    description: "Bytes sent on all network interfaces.",
    unit: "bytesPerSecond",
    source: "EC2",
    namespace: "AWS/EC2",
    metricName: "NetworkOut",
    statistic: "Sum",
    perSecond: true,
  },
  {
    key: "diskReadOps",
    label: "Disk Read Operations",
    description:
      "Read operations on instance store volumes. On Nitro instances, EBS volume activity is reported under AWS/EBS instead.",
    unit: "opsPerSecond",
    source: "EC2",
    namespace: "AWS/EC2",
    metricName: "DiskReadOps",
    statistic: "Sum",
    perSecond: true,
  },
  {
    key: "diskWriteOps",
    label: "Disk Write Operations",
    description:
      "Write operations on instance store volumes. On Nitro instances, EBS volume activity is reported under AWS/EBS instead.",
    unit: "opsPerSecond",
    source: "EC2",
    namespace: "AWS/EC2",
    metricName: "DiskWriteOps",
    statistic: "Sum",
    perSecond: true,
  },
  {
    key: "memory",
    label: "Memory Utilization",
    description: "Percentage of memory in use. Requires the CloudWatch Agent.",
    unit: "percent",
    source: "CWAgent",
    namespace: "CWAgent",
    metricName: "mem_used_percent",
    statistic: "Average",
    perSecond: false,
  },
  {
    key: "diskUsage",
    label: "Disk Usage (/)",
    description: "Percentage of the root filesystem in use. Requires the CloudWatch Agent.",
    unit: "percent",
    source: "CWAgent",
    namespace: "CWAgent",
    metricName: "disk_used_percent",
    statistic: "Average",
    perSecond: false,
  },
];
