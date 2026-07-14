import { ConnectorDetailView } from "@/components/connectors/connector-detail-view";

export default async function ConnectorAccountPage({
  params,
}: {
  params: Promise<{ key: string; accountId: string }>;
}) {
  const { key, accountId } = await params;
  return <ConnectorDetailView connectorKey={key} accountId={accountId} />;
}
