import type { Metadata } from "next";
import { Suspense } from "react";
import { InstancesView } from "@/components/instances/instances-view";

export const metadata: Metadata = { title: "EC2 Instances" };

export default function InstancesPage() {
  // InstancesView reads the URL query string, which requires a Suspense boundary.
  return (
    <Suspense>
      <InstancesView />
    </Suspense>
  );
}
