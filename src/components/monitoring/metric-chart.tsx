"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Cpu, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MetricSeries } from "@/lib/types";
import { formatAxisValue, formatMetricValue } from "./format";

// Single-series charts: one hue, 2px line, ~10% area wash, hairline grid.
// Colours are CSS variables (globals.css) so they follow the light/dark theme.
const SERIES_COLOR = "var(--chart-series)";
const GRID_COLOR = "var(--chart-grid)";
const AXIS_TEXT = "var(--chart-axis)";

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const fullFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

interface Point {
  ts: number;
  v: number;
}

function stats(points: Point[]) {
  const values = points.map((p) => p.v);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    latest: values[values.length - 1],
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
  };
}

/**
 * Percent axes get a "nice" top (10, 20, ... 100) with evenly spaced ticks, so
 * low values aren't flattened against a fixed 0-100 axis. Other units let
 * Recharts pick the scale.
 */
function yAxisScale(series: MetricSeries, max: number) {
  if (series.unit !== "percent") return { domain: [0, "auto"] as [number, "auto"], ticks: undefined };
  const raw = max * 1.2;
  const top = raw <= 10 ? 10 : raw <= 20 ? 20 : raw <= 40 ? Math.ceil(raw / 10) * 10 : Math.min(100, Math.ceil(raw / 20) * 20);
  const step = [5, 10, 20, 25].find((c) => top % c === 0 && top / c <= 5) ?? top;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { domain: [0, top] as [number, number], ticks };
}

function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload: Point }[]; unit: MetricSeries["unit"] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-navy-200 dark:border-navy-800 bg-white dark:bg-navy-900 px-3 py-2 text-xs shadow-lg">
      <p className="text-navy-500 dark:text-navy-400">{fullFmt.format(new Date(point.ts))}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-navy-900 dark:text-navy-100">{formatMetricValue(point.v, unit)}</p>
    </div>
  );
}

function SourceTag({ source }: { source: MetricSeries["source"] }) {
  return (
    <span className="rounded bg-navy-100 dark:bg-navy-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-navy-500 dark:text-navy-400">
      {source === "EC2" ? "AWS/EC2" : "CWAgent"}
    </span>
  );
}

export function MetricChartCard({ series }: { series: MetricSeries }) {
  const points: Point[] = series.datapoints.map((d) => ({ ts: new Date(d.t).getTime(), v: d.v }));

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-navy-900 dark:text-navy-100">{series.label}</h3>
            <SourceTag source={series.source} />
          </div>
          <p className="mt-0.5 text-xs text-navy-500 dark:text-navy-400">{series.description}</p>
        </div>
        {points.length > 0 ? (
          <div className="shrink-0 text-right">
            <p className="whitespace-nowrap text-lg font-semibold tabular-nums text-navy-900 dark:text-navy-100">{formatMetricValue(stats(points).latest, series.unit)}</p>
            <p className="text-[11px] text-navy-500 dark:text-navy-400">latest</p>
          </div>
        ) : null}
      </div>

      {series.status === "ok" && points.length > 0 ? (
        <ChartBody series={series} points={points} />
      ) : series.status === "agent_required" ? (
        <AgentRequired />
      ) : (
        <NoData />
      )}
    </Card>
  );
}

function ChartBody({ series, points }: { series: MetricSeries; points: Point[] }) {
  const s = stats(points);
  const yScale = yAxisScale(series, s.max);
  return (
    <>
      <div className="h-48 px-2 pt-3" role="img" aria-label={`${series.label} line chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={1} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts: number) => timeFmt.format(new Date(ts))}
              tick={{ fontSize: 11, fill: AXIS_TEXT }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              width={60}
              domain={yScale.domain}
              ticks={yScale.ticks}
              tickCount={yScale.ticks ? undefined : 4}
              tickFormatter={(v: number) => formatAxisValue(v, series.unit)}
              tick={{ fontSize: 11, fill: AXIS_TEXT }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip unit={series.unit} />}
              cursor={{ stroke: "var(--chart-cursor)", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={SERIES_COLOR}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--chart-surface)", strokeWidth: 2, fill: SERIES_COLOR }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <dl className="grid grid-cols-3 gap-2 border-t border-navy-100 dark:border-navy-800 px-5 py-3 text-xs">
        {(["min", "avg", "max"] as const).map((key) => (
          <div key={key}>
            <dt className="uppercase tracking-wide text-navy-400 dark:text-navy-500">{key}</dt>
            <dd className="font-medium tabular-nums text-navy-700 dark:text-navy-300">{formatMetricValue(s[key], series.unit)}</dd>
          </div>
        ))}
      </dl>
      <details className="border-t border-navy-100 dark:border-navy-800 px-5 py-2 text-xs text-navy-500 dark:text-navy-400">
        <summary className="cursor-pointer select-none py-1 hover:text-navy-700 dark:hover:text-navy-300">Show data table ({points.length} points)</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white dark:bg-navy-900 text-navy-400 dark:text-navy-500">
              <tr>
                <th scope="col" className="py-1 font-medium">Time</th>
                <th scope="col" className="py-1 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-navy-700 dark:text-navy-300">
              {[...points].reverse().map((p) => (
                <tr key={p.ts}>
                  <td className="py-0.5">{fullFmt.format(new Date(p.ts))}</td>
                  <td className="py-0.5 text-right">{formatMetricValue(p.v, series.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function NoData() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <BarChart3 className="size-6 text-navy-300 dark:text-navy-600" aria-hidden />
      <p className="mt-2 text-sm font-medium text-navy-700 dark:text-navy-300">No data available</p>
      <p className="mt-1 max-w-xs text-xs text-navy-500 dark:text-navy-400">
        CloudWatch returned no datapoints for this period. The instance may be stopped, recently launched, or this metric
        isn&apos;t reported for its instance type.
      </p>
    </div>
  );
}

function AgentRequired() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <Cpu className="size-6 text-navy-300 dark:text-navy-600" aria-hidden />
      <p className="mt-2 text-sm font-medium text-navy-700 dark:text-navy-300">No data available: CloudWatch Agent required</p>
      <p className="mt-1 max-w-sm text-xs text-navy-500 dark:text-navy-400">
        EC2 doesn&apos;t report memory or filesystem usage by default. Install the CloudWatch Agent on this instance and
        publish <code className="font-mono">mem_used_percent</code> and <code className="font-mono">disk_used_percent</code>.
      </p>
      <a
        href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ocean-700 dark:text-ocean-300 hover:underline"
      >
        <Info className="size-3.5" /> How to install the CloudWatch Agent
      </a>
    </div>
  );
}
