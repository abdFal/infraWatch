import type { MetricUnit } from "@/lib/types";
import { formatBytes, formatNumber } from "@/lib/utils";

export function formatMetricValue(value: number, unit: MetricUnit) {
  switch (unit) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "bytesPerSecond":
      return `${formatBytes(value)}/s`;
    case "opsPerSecond":
      return `${formatNumber(value, 2)} ops/s`;
  }
}

export function formatAxisValue(value: number, unit: MetricUnit) {
  switch (unit) {
    case "percent":
      return `${Math.round(value)}%`;
    case "bytesPerSecond":
      return formatBytes(value, 0);
    case "opsPerSecond":
      return formatNumber(value, 1);
  }
}
