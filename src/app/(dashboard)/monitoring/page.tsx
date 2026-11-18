import type { Metadata } from "next";
import { Suspense } from "react";
import { MonitoringView } from "@/components/monitoring/monitoring-view";

export const metadata: Metadata = { title: "Monitoring" };

export default function MonitoringPage() {
  return (
    <Suspense>
      <MonitoringView />
    </Suspense>
  );
}
