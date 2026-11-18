"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { AWS_REGIONS } from "@/lib/aws/regions";
import { useApi } from "@/lib/hooks/use-api";
import { REFRESH_INTERVALS, TIME_RANGES, type TimeRangeKey } from "@/lib/time-ranges";
import { formatDateTime } from "@/lib/utils";

interface SettingsData {
  app: { awsRegion: string; updatedAt: string | null; updatedBy: string | null };
  preferences: { refreshIntervalSec: number; defaultTimeRange: TimeRangeKey };
  environment: {
    appVersion: string;
    nodeEnv: string;
    nodeVersion: string;
    providerMode: "MOCK" | "AWS";
    defaultRegion: string;
    awsApiTimeoutMs: number;
    credentialSource: string;
  };
  canEditAppSettings: boolean;
}

async function putJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error?.message ?? "Saving failed.");
  return json.data;
}

export function SettingsView() {
  const { data, error, isLoading, refetch } = useApi<SettingsData>("/api/settings");

  return (
    <>
      <PageHeader title="Settings" description="Monitoring configuration and environment information." />
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      ) : null}
      {error ? (
        <Card>
          <ErrorState message={error.message} onRetry={refetch} />
        </Card>
      ) : null}
      {data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <RegionCard data={data} onSaved={refetch} />
          <PreferencesCard data={data} onSaved={refetch} />
          <EnvironmentCard data={data} />
        </div>
      ) : null}
    </>
  );
}

function RegionCard({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  const router = useRouter();
  const [region, setRegion] = useState(data.app.awsRegion);
  const [saving, setSaving] = useState(false);
  const dirty = region !== data.app.awsRegion;

  async function save() {
    setSaving(true);
    try {
      await putJson("/api/settings/app", { awsRegion: region });
      toast.success("AWS region updated", { description: `Now monitoring ${region}.` });
      onSaved();
      router.refresh(); // update the region shown in the top bar
    } catch (e) {
      toast.error("Couldn't update region", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="AWS configuration"
        description="Application-wide. Applies to all users."
        actions={!data.canEditAppSettings ? <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Lock className="size-3.5" /> Admin only</span> : null}
      />
      <CardBody className="space-y-4">
        <div>
          <label htmlFor="region" className="text-sm font-medium text-slate-700">AWS Region</label>
          <Select id="region" className="mt-1.5" value={region} onChange={(e) => setRegion(e.target.value)} disabled={!data.canEditAppSettings || saving}>
            {AWS_REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} · {r.name}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-slate-500">
            {data.app.updatedBy
              ? `Last changed by ${data.app.updatedBy} on ${formatDateTime(data.app.updatedAt)}.`
              : `Using the initial value from AWS_REGION (${data.environment.defaultRegion}).`}
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-slate-400" />
          AWS credentials are never stored in the database or sent to the browser. In AWS mode the server uses the
          default credential provider chain (an IAM role on EC2, or an AWS CLI profile locally).
        </div>
        {data.canEditAppSettings ? (
          <div className="flex justify-end">
            <Button variant="primary" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save region
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function PreferencesCard({ data, onSaved }: { data: SettingsData; onSaved: () => void }) {
  const router = useRouter();
  const [refreshIntervalSec, setRefresh] = useState(data.preferences.refreshIntervalSec);
  const [defaultTimeRange, setRange] = useState<TimeRangeKey>(data.preferences.defaultTimeRange);
  const [saving, setSaving] = useState(false);
  const dirty =
    refreshIntervalSec !== data.preferences.refreshIntervalSec || defaultTimeRange !== data.preferences.defaultTimeRange;

  async function save() {
    setSaving(true);
    try {
      await putJson("/api/settings/preferences", { refreshIntervalSec, defaultTimeRange });
      toast.success("Monitoring preferences saved");
      onSaved();
      router.refresh(); // dashboard pages pick up the new interval/range
    } catch (e) {
      toast.error("Couldn't save preferences", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Monitoring preferences" description="Personal. Only affects your account." />
      <CardBody className="space-y-4">
        <div>
          <label htmlFor="refresh" className="text-sm font-medium text-slate-700">Refresh interval</label>
          <Select id="refresh" className="mt-1.5" value={refreshIntervalSec} onChange={(e) => setRefresh(Number(e.target.value))} disabled={saving}>
            {REFRESH_INTERVALS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-slate-500">How often dashboards reload data automatically. Paused while the tab is hidden.</p>
        </div>
        <div>
          <label htmlFor="range" className="text-sm font-medium text-slate-700">Default time range</label>
          <Select id="range" className="mt-1.5" value={defaultTimeRange} onChange={(e) => setRange(e.target.value as TimeRangeKey)} disabled={saving}>
            {TIME_RANGES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-slate-500">Initial period for metric charts.</p>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save preferences
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function EnvironmentCard({ data }: { data: SettingsData }) {
  const env = data.environment;
  const rows: [string, React.ReactNode][] = [
    ["Data provider", env.providerMode === "MOCK" ? "MOCK (generated demo data)" : "AWS (live EC2 + CloudWatch)"],
    ["Environment", env.nodeEnv],
    ["Application version", env.appVersion],
    ["Node.js", env.nodeVersion],
    ["Default region (AWS_REGION)", env.defaultRegion],
    ["AWS API timeout", `${env.awsApiTimeoutMs / 1000}s`],
    ["AWS credentials", env.credentialSource],
  ];
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Application environment" description="Read-only. Configured through server environment variables." />
      <dl className="divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-slate-900 sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
