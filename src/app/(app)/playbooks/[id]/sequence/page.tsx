"use client";

import { useParams } from "next/navigation";
import { SequenceEditor } from "@/components/playbooks/sequence-editor";

export default function PlaybookSequencePage() {
  const { id } = useParams<{ id: string }>();
  return <SequenceEditor playbookId={id} />;
}
