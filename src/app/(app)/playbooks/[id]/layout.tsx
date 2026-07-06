import { PlaybookShell } from "@/components/playbooks/playbook-shell";

export default function PlaybookLayout({ children }: { children: React.ReactNode }) {
  return <PlaybookShell>{children}</PlaybookShell>;
}
