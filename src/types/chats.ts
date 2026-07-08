import type { PlaybookProspectStatus, ThreadMessage } from "@/types/playbooks";

export type ChatDirection = "outreach" | "inbox";
export type ChatDeliveryMode = "platform" | "email";

export type ChatInboxItem = {
  run_contact_id: string;
  run_id: string;
  playbook_id: string;
  playbook_name: string;
  contact_id: string;
  contact_name: string;
  contact_email: string | null;
  contact_title: string | null;
  company_name: string | null;
  status: PlaybookProspectStatus;
  last_message_at: string | null;
  last_message_preview: string | null;
  message_count: number;
  direction: ChatDirection;
  delivery_mode?: ChatDeliveryMode | null;
  recipient_on_platform?: boolean;
};

export type ChatActivityItem = {
  id: string;
  type: "message" | "email_sent" | "reply" | "booked" | "draft" | "system" | "audit";
  title: string;
  body?: string | null;
  created_at: string;
};

export type ChatDetail = {
  inbox: ChatInboxItem;
  messages: ThreadMessage[];
  activities: ChatActivityItem[];
  chat_enabled: boolean;
  delivery_mode: ChatDeliveryMode | null;
  recipient_on_platform: boolean;
  viewer_role: "sender" | "recipient";
};
