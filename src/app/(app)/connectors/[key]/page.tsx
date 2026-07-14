import { ConnectorDetailView } from "@/components/connectors/connector-detail-view";

export default async function ConnectorDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <ConnectorDetailView connectorKey={key} />;
}
