"use client";

import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <ErrorState title="This page failed to load" message="An unexpected error occurred. Please try again." onRetry={reset} />
    </Card>
  );
}
