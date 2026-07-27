import type { ThreadMessage } from "@/types/playbooks";

export type ChatViewerRole = "sender" | "recipient";

/** Playbook outreach logs — visible to sender only, not the recipient inbox. */
export function isSenderOnlyThreadMessage(msg: ThreadMessage): boolean {
  if (msg.message_type !== "system") return false;

  const event = msg.metadata?.event;
  if (event === "calendly_booked") return false;
  if (msg.metadata?.audience === "all") return false;

  if (msg.metadata?.audience === "sender") return true;
  if (msg.metadata?.channel === "email") return true;
  if (msg.body.startsWith("Email sent:")) return true;

  return false;
}

export function filterThreadMessagesForViewer(
  messages: ThreadMessage[],
  viewerRole: ChatViewerRole,
): ThreadMessage[] {
  if (viewerRole === "sender") return messages;
  return messages.filter((msg) => !isSenderOnlyThreadMessage(msg));
}

export function isOwnChatMessage(msg: ThreadMessage, viewerRole: ChatViewerRole): boolean {
  if (msg.message_type === "system") return false;

  if (viewerRole === "recipient") {
    return msg.message_type === "platform_inbound" || msg.message_type === "inbound_email";
  }

  return (
    msg.message_type === "platform_outbound" ||
    msg.message_type === "outbound_chat_email" ||
    msg.message_type === "text"
  );
}

/** Confirmed row from the viewer's own send (used to swap an optimistic pending bubble). */
export function isOwnOutgoingThreadMessage(msg: ThreadMessage, viewerRole: ChatViewerRole): boolean {
  if (viewerRole === "recipient") {
    return msg.message_type === "platform_inbound";
  }

  return msg.message_type === "platform_outbound" || msg.message_type === "outbound_chat_email";
}

export function shouldNotifySenderOfThreadEvent(msg: ThreadMessage): boolean {
  if (msg.message_type === "inbound_email") return true;
  return msg.message_type === "system" && msg.metadata?.event === "calendly_booked";
}
