import { ContactDetailView } from "@/components/contacts/contact-detail-view";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactDetailView contactId={id} />;
}
