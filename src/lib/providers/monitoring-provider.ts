import type { DataSource, Ec2Instance, InstanceMetrics } from "@/lib/types";
import type { TimeRangeKey } from "@/lib/time-ranges";

/**
 * The contract every monitoring data source implements.
 *
 * There are two implementations: MockMonitoringProvider (generated demo data)
 * and AwsMonitoringProvider (your real account through AWS SDK v3).
 * monitoring-service.ts combines them, so UI code and API routes never talk to
 * a provider directly. Every method is read-only by design: there is
 * deliberately no start/stop/reboot/terminate here.
 */
export interface MonitoringProvider {
  readonly source: DataSource;
  listInstances(region: string): Promise<Ec2Instance[]>;
  getInstance(region: string, instanceId: string): Promise<Ec2Instance | null>;
  getInstanceMetrics(
    region: string,
    instance: Ec2Instance,
    range: TimeRangeKey,
  ): Promise<InstanceMetrics>;
}

export type ProviderErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "ACCESS_DENIED"
  | "THROTTLED"
  | "TIMEOUT"
  | "UNAVAILABLE";

/**
 * A provider failure with a message that is safe to show to users.
 * The original error is kept in `cause` for server logs only.
 */
export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ProviderError";
  }

  get httpStatus() {
    switch (this.code) {
      case "THROTTLED":
        return 429;
      case "TIMEOUT":
        return 504;
      case "NOT_CONFIGURED":
      case "INVALID_CREDENTIALS":
      case "ACCESS_DENIED":
      case "UNAVAILABLE":
      default:
        return 503;
    }
  }
}
