import type { Ec2Instance, InstanceMetrics } from "@/lib/types";
import type { TimeRangeKey } from "@/lib/time-ranges";

export type ProviderMode = "MOCK" | "AWS";

/**
 * The contract every monitoring data source implements.
 *
 * UI code and API routes depend only on this interface, so switching from the
 * mock provider to the real AWS provider is an environment-variable change,
 * not a rewrite. Every method is read-only by design: there is deliberately no
 * start/stop/reboot/terminate here.
 */
export interface MonitoringProvider {
  readonly mode: ProviderMode;
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
      case "ACCESS_DENIED":
      case "UNAVAILABLE":
      default:
        return 503;
    }
  }
}
