import "server-only";
import { getEnv } from "@/lib/env";
import { MockMonitoringProvider } from "./mock-provider";
import { ProviderError, type MonitoringProvider } from "./monitoring-provider";

let instance: MonitoringProvider | undefined;

/**
 * Returns the provider selected by MONITORING_PROVIDER.
 *
 * There is no silent fallback: if AWS mode is requested but unavailable, the
 * request fails with a clear error instead of quietly serving mock data.
 */
export function getMonitoringProvider(): MonitoringProvider {
  if (instance) return instance;
  const { MONITORING_PROVIDER } = getEnv();

  switch (MONITORING_PROVIDER) {
    case "MOCK":
      instance = new MockMonitoringProvider();
      return instance;
    case "AWS":
      // Implemented in Phase 2 (src/lib/providers/aws-provider.ts).
      throw new ProviderError(
        "NOT_CONFIGURED",
        "AWS mode is not available yet in this build. Set MONITORING_PROVIDER=MOCK, or complete Phase 2 (AWS integration).",
      );
  }
}

export function getProviderMode() {
  return getEnv().MONITORING_PROVIDER;
}

export { ProviderError } from "./monitoring-provider";
export type { MonitoringProvider, ProviderMode } from "./monitoring-provider";
