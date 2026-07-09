import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { isDataDemoMode } from "@/lib/app-config";
import { listContacts } from "@/lib/data/contacts";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getDemoContacts } from "@/lib/demo-store";
import { DashboardClient } from "./dashboard-client";

async function getRecentContactsPayload() {
  if (isDataDemoMode()) {
    const contacts = getDemoContacts().slice(0, 5);
    return { contacts, total: contacts.length };
  }

  const contacts = await listContacts({ limit: 5 });
  return { contacts, total: contacts.length };
}

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["dashboard"],
      queryFn: () => getDashboardStats(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["contacts", "recent"],
      queryFn: () => getRecentContactsPayload(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
