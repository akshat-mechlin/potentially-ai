"use client";

import { useParams } from "next/navigation";
import { PlaybookSettingsForm } from "@/components/playbooks/playbook-settings-form";
import { usePlaybook } from "@/hooks/use-playbook";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlaybookSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePlaybook(id);

  if (isLoading || !data?.playbook) {
    return <Skeleton className="h-48" />;
  }

  return <PlaybookSettingsForm playbook={data.playbook} />;
}
