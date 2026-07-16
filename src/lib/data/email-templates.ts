import { isDataDemoMode } from "@/lib/app-config";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type { EmailTemplate } from "@/types/playbooks";

let demoTemplates: EmailTemplate[] = [
  {
    id: "tpl-demo-1",
    workspace_id: "demo-workspace-001",
    created_by: "demo-user-001",
    name: "Intro call request",
    subject: "Quick intro: {{company}}",
    preheader: "15-minute chat",
    body_html: "<p>Hi {{name}},</p><p>I noticed your work at {{company}} and would love a brief intro call.</p>",
    body_text: "Hi {{name}}, I noticed your work at {{company}} and would love a brief intro call.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function getDemoEmailTemplates() {
  return demoTemplates;
}

export function getDemoEmailTemplate(id: string) {
  return demoTemplates.find((t) => t.id === id) ?? null;
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  if (isDataDemoMode()) return getDemoEmailTemplates();

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return [];

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EmailTemplate[];
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  if (isDataDemoMode()) return getDemoEmailTemplate(id);

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return null;

  const { data, error } = await supabase.from("email_templates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as EmailTemplate) ?? null;
}

export function applyTemplate(
  template: EmailTemplate,
  vars: { name: string; company?: string | null; title?: string | null },
) {
  const replace = (text: string) =>
    text
      .replace(/\{\{name\}\}/gi, vars.name)
      .replace(/\{\{company\}\}/gi, vars.company ?? "your company")
      .replace(/\{\{title\}\}/gi, vars.title ?? "");

  return {
    subject: replace(template.subject),
    body: replace(template.body_text ?? template.body_html.replace(/<[^>]+>/g, " ")),
  };
}

export async function createEmailTemplate(input: {
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  preheader?: string;
}) {
  if (isDataDemoMode()) {
    const template: EmailTemplate = {
      id: `tpl-${Date.now()}`,
      workspace_id: "demo-workspace-001",
      created_by: "demo-user-001",
      name: input.name,
      subject: input.subject,
      preheader: input.preheader ?? null,
      body_html: input.body_html,
      body_text: input.body_text ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoTemplates = [template, ...demoTemplates];
    return template;
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      name: input.name,
      subject: input.subject,
      preheader: input.preheader ?? null,
      body_html: input.body_html,
      body_text: input.body_text ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as EmailTemplate;
}

export async function deleteEmailTemplate(id: string) {
  if (isDataDemoMode()) {
    demoTemplates = demoTemplates.filter((t) => t.id !== id);
    return;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw error;
}
