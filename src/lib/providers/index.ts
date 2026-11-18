import "server-only";
import { getEnv } from "@/lib/env";
import type { DataSource, MonitoringMode } from "@/lib/types";
import { AwsMonitoringProvider } from "./aws-provider";
import { MockMonitoringProvider } from "./mock-provider";
import type { MonitoringProvider } from "./monitoring-provider";

/**
 * MONITORING_PROVIDER decides which sources the dashboard combines:
 *   HYBRID -> AWS + MOCK side by side (each instance labelled with its source)
 *   MOCK   -> generated demo data only (no AWS calls at all)
 *   AWS    -> your real account only
 *
 * There is no silent fallback. If AWS fails in HYBRID mode, mock instances stay
 * visible AND the UI shows that the AWS source failed and why.
 */
const SOURCES_BY_MODE: Record<MonitoringMode, DataSource[]> = {
  HYBRID: ["AWS", "MOCK"],
  MOCK: ["MOCK"],
  AWS: ["AWS"],
};

const providers = new Map<DataSource, MonitoringProvider>();

export function getProviderMode(): MonitoringMode {
  return getEnv().MONITORING_PROVIDER;
}

export function getEnabledSources(): DataSource[] {
  return SOURCES_BY_MODE[getProviderMode()];
}

export function isSourceEnabled(source: DataSource) {
  return getEnabledSources().includes(source);
}

export function getProvider(source: DataSource): MonitoringProvider {
  const existing = providers.get(source);
  if (existing) return existing;
  const created = source === "AWS" ? new AwsMonitoringProvider() : new MockMonitoringProvider();
  providers.set(source, created);
  return created;
}

export { ProviderError } from "./monitoring-provider";
export type { MonitoringProvider, ProviderErrorCode } from "./monitoring-provider";
