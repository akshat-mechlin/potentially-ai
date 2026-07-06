import { SegmentDetailView } from "@/components/segments/segment-detail-view";

export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SegmentDetailView segmentId={id} />;
}
