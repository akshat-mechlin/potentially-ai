import { isDataDemoMode } from "@/lib/app-config";
import {
  createDemoIntroduction,
  getDemoContactById,
  getDemoIntroductions,
} from "@/lib/demo-store";
import type { Contact, Introduction } from "@/types";
import { introRequestEmail } from "@/lib/email/templates";
import { resolveOutboundFromAddress } from "@/lib/email/from-address";
import { sendEmail } from "@/lib/email/send";
import { getWorkspaceEmailSettingsForSend } from "@/lib/data/workspace-email-settings";
import { createAdminClient, getAppUrl } from "@/lib/supabase/admin";
import { getUserWorkspaceContext, listUserWorkspaces } from "./workspace";

type IntroSupabase = NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>;

export type IntroDelivery = "mailto" | "potentially";

export type CreateIntroductionResult = Introduction & {
  delivery: IntroDelivery;
  mailto?: { to: string; subject: string; body: string; href: string };
  email_skipped?: boolean;
  target_name?: string;
};

function buildMailtoHref(to: string, subject: string, body: string) {
  const parts = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ];
  return `mailto:${to}?${parts.join("&")}`;
}

function buildIntroPlainText(input: {
  recipientName: string | null;
  requesterName: string;
  message?: string | null;
  ctaUrl: string;
}) {
  const first = input.recipientName?.trim().split(/\s+/)[0] || null;
  const greeting = first ? `Hi ${first},` : "Hi,";
  const note = input.message?.trim()
    ? `\n\nA note from ${input.requesterName}:\n${input.message.trim()}\n`
    : "\n";
  const subject = `${input.requesterName} on Potentially would like an introduction`;
  const body = `${greeting}

${input.requesterName} is reaching out through Potentially and would like an introduction to you.

Potentially helps people find warm paths through their professional networks. ${input.requesterName} came across your profile there and thought a short introduction would be a good next step.
${note}
If you are open to connecting, reply to this email and say hello. A quick note back is enough to get the conversation started. If now is not the right time, you can ignore this message with no further follow up from us.

Thanks for considering it. We appreciate your time.

Learn more: ${input.ctaUrl}`;
  return { subject, body };
}

export async function listIntroductions(): Promise<Introduction[]> {
  if (isDataDemoMode()) return getDemoIntroductions();

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) throw new Error("Unauthorized");

  const workspaceIds = (await listUserWorkspaces(supabase)).map((workspace) => workspace.id);
  if (!workspaceIds.length) return [];

  const { data: rows, error } = await supabase
    .from("introductions")
    .select("*")
    .in("workspace_id", workspaceIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!rows?.length) return [];

  const contactIds = rows.map((r) => r.target_contact_id);
  const connectorIds = rows.map((r) => r.connector_id).filter(Boolean) as string[];

  const [{ data: contacts }, { data: connectors }] = await Promise.all([
    supabase.from("contacts").select("*").in("id", contactIds),
    connectorIds.length
      ? supabase.from("profiles").select("id, name").in("id", connectorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const contactMap = new Map((contacts as Contact[] | null)?.map((c) => [c.id, c]) ?? []);
  const connectorMap = new Map(
    (connectors as { id: string; name: string }[] | null)?.map((c) => [c.id, c.name]) ?? [],
  );

  return rows.map((row) => ({
    ...(row as Introduction),
    target_contact: contactMap.get(row.target_contact_id),
    connector_name: row.connector_id ? (connectorMap.get(row.connector_id) ?? null) : null,
  }));
}

export async function createIntroduction(
  targetContactId: string,
  message?: string,
  asAdmin?: {
    supabase: ReturnType<typeof createAdminClient>;
    userId: string;
    workspaceId?: string;
    connectorId?: string | null;
  },
  options?: { connectorId?: string | null; delivery?: IntroDelivery },
): Promise<CreateIntroductionResult> {
  const delivery: IntroDelivery = options?.delivery ?? "potentially";

  if (isDataDemoMode()) {
    const contact = getDemoContactById(targetContactId);
    if (!contact) throw new Error("Contact not found");
    if (!contact.email) throw new Error("This contact has no email address");
    const intro = createDemoIntroduction(targetContactId);
    if (!intro) throw new Error("Failed to create introduction");
    if (message) intro.message = message;
    intro.connector_id = options?.connectorId ?? null;
    intro.connector_name = null;
    const ctaUrl = getAppUrl();
    const plain = buildIntroPlainText({
      recipientName: contact.full_name,
      requesterName: "Alex Morgan",
      message,
      ctaUrl,
    });
    return {
      ...intro,
      delivery,
      target_name: contact.full_name,
      mailto: {
        to: contact.email,
        subject: plain.subject,
        body: plain.body,
        href: buildMailtoHref(contact.email, plain.subject, plain.body),
      },
      email_skipped: delivery === "potentially",
    };
  }

  const session = asAdmin ? null : await getUserWorkspaceContext();
  const supabase = (asAdmin?.supabase ?? session?.supabase) as IntroSupabase | null;
  const userId = asAdmin?.userId ?? session?.user?.id;
  if (!supabase || !userId) throw new Error("Unauthorized");

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, full_name, email, workspace_id, owner_id")
    .eq("id", targetContactId)
    .maybeSingle();

  if (!contact) throw new Error("Contact not found");
  if (!contact.email) throw new Error("This contact has no email address");

  const workspaceId = (asAdmin?.workspaceId ?? contact.workspace_id) as string;
  const connectorId = options?.connectorId ?? asAdmin?.connectorId ?? null;

  const { data: requester } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("id", userId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("introductions")
    .insert({
      workspace_id: workspaceId,
      requester_id: userId,
      connector_id: connectorId,
      target_contact_id: targetContactId,
      status: "requested",
      message: message ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  const requesterName =
    (requester as { name?: string | null } | null)?.name?.trim() ||
    session?.user?.email ||
    "Someone";
  const targetName = contact.full_name;
  const ctaUrl = getAppUrl();
  const plain = buildIntroPlainText({
    recipientName: targetName,
    requesterName,
    message,
    ctaUrl,
  });
  const mailto = {
    to: contact.email,
    subject: plain.subject,
    body: plain.body,
    href: buildMailtoHref(contact.email, plain.subject, plain.body),
  };

  let emailSkipped = false;

  if (delivery === "potentially") {
    try {
      const emailSettings = await getWorkspaceEmailSettingsForSend(supabase, workspaceId);
      if (emailSettings.mode === "custom" && emailSettings.senderDomainStatus !== "verified") {
        throw new Error(
          "Your send domain is not verified yet. Open Settings → Email to finish DNS setup, or switch to Potentially email.",
        );
      }

      const senderEmail =
        (requester as { email?: string | null } | null)?.email ??
        session?.user?.email ??
        undefined;
      const { from, replyTo } = resolveOutboundFromAddress(emailSettings, senderEmail);
      const template = await introRequestEmail({
        recipientName: targetName,
        requesterName,
        message,
        ctaUrl,
      });
      const result = await sendEmail({
        to: contact.email,
        subject: template.subject,
        html: template.html,
        from,
        replyTo,
      });
      emailSkipped = Boolean(result && "skipped" in result && result.skipped);
    } catch (emailError) {
      console.error("Intro request email failed:", emailError);
      await supabase.from("introductions").delete().eq("id", data.id);
      throw new Error(
        emailError instanceof Error
          ? emailError.message
          : "Failed to email this contact about the intro request.",
      );
    }
  }

  const fullContact = await supabase.from("contacts").select("*").eq("id", targetContactId).single();

  await supabase.from("notifications").insert({
    user_id: userId,
    workspace_id: workspaceId,
    title: "Introduction requested",
    message:
      delivery === "mailto"
        ? `Intro request to ${targetName} is ready in your mail app`
        : `We emailed ${targetName} that you would like an introduction`,
    type: "intro",
    link: "/intros",
  });

  return {
    ...(data as Introduction),
    target_contact: fullContact.data as Contact,
    connector_name: null,
    delivery,
    mailto,
    email_skipped: emailSkipped,
    target_name: targetName,
  };
}
