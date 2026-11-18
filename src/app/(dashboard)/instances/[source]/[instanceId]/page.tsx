import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstanceDetailView } from "@/components/instances/instance-detail-view";
import { instanceIdSchema, sourceSlugSchema } from "@/lib/validation/schemas";

type Props = { params: Promise<{ source: string; instanceId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { instanceId } = await params;
  return { title: instanceId };
}

/** /instances/aws/i-0abc... (real) or /instances/mock/i-0abc... (demo data) */
export default async function InstanceDetailPage({ params }: Props) {
  const { source: rawSource, instanceId } = await params;
  const source = sourceSlugSchema.safeParse(rawSource);
  if (!source.success || !instanceIdSchema.safeParse(instanceId).success) notFound();
  return <InstanceDetailView source={source.data} instanceId={instanceId} />;
}
