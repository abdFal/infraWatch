import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstanceDetailView } from "@/components/instances/instance-detail-view";
import { instanceIdSchema } from "@/lib/validation/schemas";

export async function generateMetadata({ params }: { params: Promise<{ instanceId: string }> }): Promise<Metadata> {
  const { instanceId } = await params;
  return { title: instanceId };
}

export default async function InstanceDetailPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = await params;
  if (!instanceIdSchema.safeParse(instanceId).success) notFound();
  return <InstanceDetailView instanceId={instanceId} />;
}
