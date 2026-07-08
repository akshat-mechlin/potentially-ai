import { findPlatformUserByEmail } from "@/lib/data/platform-users";
import { sendChatMessageEmail } from "@/lib/email/chat-message";
import { getWorkspaceEmailSettingsForSend } from "@/lib/data/workspace-email-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChatDeliveryMode = "platform" | "email";

export type ChatDeliveryInfo = {
  mode: ChatDeliveryMode;
  recipientUserId: string | null;
  recipientOnPlatform: boolean;
};

export async function resolveChatDelivery(contactEmail: string | null): Promise<ChatDeliveryInfo> {
  const match = await findPlatformUserByEmail(contactEmail);
  if (match) {
    return {
      mode: "platform",
      recipientUserId: match.id,
      recipientOnPlatform: true,
    };
  }
  return {
    mode: "email",
    recipientUserId: null,
    recipientOnPlatform: false,
  };
}

export async function emailChatToContact(input: {
  to: string;
  recipientName: string | null;
  senderName: string;
  senderEmail: string | null;
  senderWorkspaceName: string | null;
  workspaceId: string;
  body: string;
  runContactId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/signup?email=${encodeURIComponent(input.to)}&redirect=${encodeURIComponent(`/chats/${input.runContactId}`)}`;
  const chatUrl = `${appUrl}/chats/${input.runContactId}`;

  let emailSettings;
  try {
    const admin = createAdminClient();
    emailSettings = await getWorkspaceEmailSettingsForSend(admin, input.workspaceId);
  } catch {
    emailSettings = undefined;
  }

  await sendChatMessageEmail({
    to: input.to,
    recipientName: input.recipientName,
    senderName: input.senderName,
    senderWorkspaceName: input.senderWorkspaceName,
    body: input.body,
    inviteUrl,
    chatUrl,
    runContactId: input.runContactId,
    emailSettings,
    senderEmail: input.senderEmail,
  });
}
