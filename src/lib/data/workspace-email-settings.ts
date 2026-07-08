import { isDataDemoMode } from "@/lib/app-config";
import {
  getDemoWorkspaceEmailSettings,
  setupDemoWorkspaceDomain,
  updateDemoWorkspaceEmailSettings,
  verifyDemoWorkspaceDomain,
} from "@/lib/demo-store/workspace-email";
import { getPlatformFromAddress, type OutboundFromInput } from "@/lib/email/from-address";
import {
  extractDomainFromEmail,
  getWorkspaceDomainSetup,
  isDomainManagementAvailable,
  isPlatformSenderDomain,
  isPublicEmailDomain,
  resetDomainManagementCache,
  syncSenderDomainWithResend,
  verifyWorkspaceDomain,
  type SenderDomainStatus,
} from "@/lib/email/sender-domain";
import type { EmailSenderMode, WorkspaceEmailSettings, WorkspaceRole } from "@/types";
import { getUserWorkspaceContext } from "./workspace";

export type { OutboundFromInput };

export type OutboundFromInputWithDomain = OutboundFromInput & {
  senderDomainStatus: SenderDomainStatus;
};

const workspaceEmailColumns =
  "email_sender_mode, custom_sender_name, custom_sender_email, sender_domain, sender_domain_status, resend_domain_id";

type WorkspaceEmailRow = {
  email_sender_mode: string;
  custom_sender_name: string | null;
  custom_sender_email: string | null;
  sender_domain?: string | null;
  sender_domain_status?: string | null;
  resend_domain_id?: string | null;
};

function canEditWorkspace(role: WorkspaceRole | undefined) {
  return role === "owner" || role === "admin";
}

function mapMode(value: string): EmailSenderMode {
  if (value === "custom") return "custom";
  return "platform";
}

async function mapRow(
  row: WorkspaceEmailRow,
  canEdit: boolean,
): Promise<WorkspaceEmailSettings> {
  const domainSetup = await getWorkspaceDomainSetup({
    domain: row.sender_domain ?? null,
    resendDomainId: row.resend_domain_id ?? null,
    storedStatus: (row.sender_domain_status as SenderDomainStatus) ?? "not_started",
  });

  return {
    mode: mapMode(row.email_sender_mode),
    customSenderName: row.custom_sender_name,
    customSenderEmail: row.custom_sender_email,
    platformFromAddress: getPlatformFromAddress(),
    canEdit,
    senderDomain: row.sender_domain ?? null,
    senderDomainStatus: domainSetup.domainManagementAvailable
      ? domainSetup.status
      : ((row.sender_domain_status as SenderDomainStatus) ?? domainSetup.status),
    domainSetup: {
      records: domainSetup.records,
      resendConfigured: domainSetup.resendConfigured,
      domainManagementAvailable: domainSetup.domainManagementAvailable,
    },
  };
}

async function autoSyncCustomDomain(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  workspaceId: string,
  workspace: WorkspaceEmailRow,
): Promise<WorkspaceEmailRow> {
  if (mapMode(workspace.email_sender_mode) !== "custom") return workspace;

  const domain =
    workspace.sender_domain ??
    (workspace.custom_sender_email ? extractDomainFromEmail(workspace.custom_sender_email) : null);

  if (!domain || isPublicEmailDomain(domain)) return workspace;

  if (
    isPlatformSenderDomain(domain) &&
    workspace.sender_domain_status === "verified" &&
    workspace.sender_domain === domain
  ) {
    return workspace;
  }

  try {
    const canManageDomains = await isDomainManagementAvailable();
    if (!canManageDomains) return workspace;

    const synced = await syncSenderDomainWithResend(domain);
    const needsUpdate =
      workspace.sender_domain !== synced.domain ||
      workspace.sender_domain_status !== synced.status ||
      workspace.resend_domain_id !== synced.domainId;

    if (!needsUpdate) return workspace;

    const { data: updated, error } = await supabase
      .from("workspaces")
      .update({
        sender_domain: synced.domain,
        sender_domain_status: synced.status,
        resend_domain_id: synced.domainId,
      })
      .eq("id", workspaceId)
      .select(workspaceEmailColumns)
      .single();

    if (error || !updated) return workspace;
    return updated as WorkspaceEmailRow;
  } catch (error) {
    console.warn("Custom domain auto-sync failed:", error);
    return workspace;
  }
}

export async function getWorkspaceEmailSettings(workspaceId?: string | null) {
  if (isDataDemoMode()) {
    return getDemoWorkspaceEmailSettings();
  }

  resetDomainManagementCache();

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) {
    throw new Error("Unauthorized");
  }

  const [{ data: workspace, error }, { data: membership }] = await Promise.all([
    supabase.from("workspaces").select(workspaceEmailColumns).eq("id", targetWorkspaceId).single(),
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", targetWorkspaceId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (error || !workspace) {
    if (error?.code === "42703") {
      console.warn(
        "Workspace email columns unavailable (PostgREST schema may be reloading); using platform defaults.",
      );
      return mapRow(
        {
          email_sender_mode: "platform",
          custom_sender_name: null,
          custom_sender_email: null,
        },
        canEditWorkspace(membership?.role as WorkspaceRole | undefined),
      );
    }
    throw error ?? new Error("Workspace not found");
  }

  const synced = await autoSyncCustomDomain(supabase, targetWorkspaceId, workspace as WorkspaceEmailRow);
  return mapRow(synced, canEditWorkspace(membership?.role as WorkspaceRole | undefined));
}

export async function updateWorkspaceEmailSettings(
  input: {
    mode?: EmailSenderMode;
    customSenderName?: string | null;
    customSenderEmail?: string | null;
  },
  workspaceId?: string | null,
) {
  const hasMode = input.mode !== undefined;
  const hasName = input.customSenderName !== undefined;
  const hasEmail = input.customSenderEmail !== undefined;

  if (!hasMode && !hasName && !hasEmail) {
    throw new Error("Nothing to update");
  }

  if (isDataDemoMode()) {
    return updateDemoWorkspaceEmailSettings(input);
  }

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) {
    throw new Error("Unauthorized");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", targetWorkspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canEditWorkspace(membership?.role as WorkspaceRole | undefined)) {
    throw new Error("Only group owners and admins can change email settings");
  }

  const { data: existing, error: existingError } = await supabase
    .from("workspaces")
    .select(workspaceEmailColumns)
    .eq("id", targetWorkspaceId)
    .single();

  if (existingError || !existing) {
    throw existingError ?? new Error("Workspace not found");
  }

  const existingRow = existing as WorkspaceEmailRow;
  const nextMode = input.mode ?? mapMode(existingRow.email_sender_mode);
  const nextName = hasName
    ? input.customSenderName?.trim() || null
    : existingRow.custom_sender_name;
  const nextEmail = hasEmail
    ? input.customSenderEmail?.trim().toLowerCase() || null
    : existingRow.custom_sender_email;

  if (nextMode === "custom" && !nextEmail?.trim()) {
    throw new Error("Enter the email address you want to send from");
  }

  if (nextMode === "custom" && hasEmail) {
    const domain = extractDomainFromEmail(nextEmail ?? "");
    if (!domain) throw new Error("Enter a valid work email address");
    if (isPublicEmailDomain(domain)) {
      throw new Error("Use a work email on your own domain (not Gmail or Outlook).");
    }
  }

  const usesCustomFields = nextMode === "custom";
  const senderDomain = usesCustomFields ? extractDomainFromEmail(nextEmail ?? "") : null;

  const domainChanged =
    usesCustomFields &&
    hasEmail &&
    senderDomain &&
    existingRow.sender_domain &&
    existingRow.sender_domain !== senderDomain;

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .update({
      email_sender_mode: nextMode,
      custom_sender_name: usesCustomFields ? nextName : null,
      custom_sender_email: usesCustomFields ? nextEmail : null,
      sender_domain: usesCustomFields ? senderDomain : null,
      sender_domain_status:
        nextMode !== "custom"
          ? "not_started"
          : domainChanged
            ? "not_started"
            : (existingRow.sender_domain_status ?? "not_started"),
      resend_domain_id:
        nextMode !== "custom" ? null : domainChanged ? null : (existingRow.resend_domain_id ?? null),
    })
    .eq("id", targetWorkspaceId)
    .select(workspaceEmailColumns)
    .single();

  if (error || !workspace) {
    throw error ?? new Error("Failed to update email settings");
  }

  const synced = await autoSyncCustomDomain(supabase, targetWorkspaceId, workspace as WorkspaceEmailRow);
  return mapRow(synced, true);
}

export async function setupWorkspaceSenderDomain(workspaceId?: string | null) {
  if (isDataDemoMode()) {
    return setupDemoWorkspaceDomain();
  }

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) {
    throw new Error("Unauthorized");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", targetWorkspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canEditWorkspace(membership?.role as WorkspaceRole | undefined)) {
    throw new Error("Only group owners and admins can verify send domains");
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(workspaceEmailColumns)
    .eq("id", targetWorkspaceId)
    .single();

  if (error || !workspace) {
    throw error ?? new Error("Workspace not found");
  }

  const domain =
    workspace.sender_domain ??
    (workspace.custom_sender_email
      ? extractDomainFromEmail(workspace.custom_sender_email)
      : null);

  if (!domain) {
    throw new Error("Save a custom work email first");
  }

  const synced = await syncSenderDomainWithResend(domain);

  const { data: updated, error: updateError } = await supabase
    .from("workspaces")
    .update({
      sender_domain: synced.domain,
      sender_domain_status: synced.status,
      resend_domain_id: synced.domainId,
    })
    .eq("id", targetWorkspaceId)
    .select(workspaceEmailColumns)
    .single();

  if (updateError || !updated) {
    throw updateError ?? new Error("Failed to save domain setup");
  }

  return mapRow(updated, true);
}

export async function verifyWorkspaceSenderDomain(workspaceId?: string | null) {
  if (isDataDemoMode()) {
    return verifyDemoWorkspaceDomain();
  }

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) {
    throw new Error("Unauthorized");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", targetWorkspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canEditWorkspace(membership?.role as WorkspaceRole | undefined)) {
    throw new Error("Only group owners and admins can verify send domains");
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(workspaceEmailColumns)
    .eq("id", targetWorkspaceId)
    .single();

  if (error || !workspace) {
    throw error ?? new Error("Workspace not found");
  }

  const domain =
    workspace.sender_domain ??
    (workspace.custom_sender_email ? extractDomainFromEmail(workspace.custom_sender_email) : null);

  if (!domain) {
    throw new Error("Save a custom work email first");
  }

  const verified = workspace.resend_domain_id
    ? await verifyWorkspaceDomain(workspace.resend_domain_id)
    : await syncSenderDomainWithResend(domain);

  const { data: updated, error: updateError } = await supabase
    .from("workspaces")
    .update({
      sender_domain_status: verified.status,
      sender_domain: verified.domain,
      resend_domain_id: verified.domainId,
    })
    .eq("id", targetWorkspaceId)
    .select(workspaceEmailColumns)
    .single();

  if (updateError || !updated) {
    throw updateError ?? new Error("Failed to update domain status");
  }

  return mapRow(updated, true);
}

async function resolveWorkspaceDomain(workspace: WorkspaceEmailRow) {
  return (
    workspace.sender_domain ??
    (workspace.custom_sender_email ? extractDomainFromEmail(workspace.custom_sender_email) : null)
  );
}

export async function configureWorkspaceSenderDomain(workspaceId?: string | null) {
  if (isDataDemoMode()) {
    return setupDemoWorkspaceDomain();
  }

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) {
    throw new Error("Unauthorized");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", targetWorkspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canEditWorkspace(membership?.role as WorkspaceRole | undefined)) {
    throw new Error("Only group owners and admins can configure send domains");
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(workspaceEmailColumns)
    .eq("id", targetWorkspaceId)
    .single();

  if (error || !workspace) {
    throw error ?? new Error("Workspace not found");
  }

  const domain = await resolveWorkspaceDomain(workspace);
  if (!domain) {
    throw new Error("Save a custom work email first");
  }

  const canManageDomains = await isDomainManagementAvailable();
  if (canManageDomains) {
    resetDomainManagementCache();
    return setupWorkspaceSenderDomain(targetWorkspaceId);
  }

  const { data: updated, error: updateError } = await supabase
    .from("workspaces")
    .update({
      sender_domain: domain,
      sender_domain_status: "pending",
    })
    .eq("id", targetWorkspaceId)
    .select(workspaceEmailColumns)
    .single();

  if (updateError || !updated) {
    throw updateError ?? new Error("Failed to save domain configuration");
  }

  return mapRow(updated, true);
}

export async function markWorkspaceSenderDomainVerified(workspaceId?: string | null) {
  if (isDataDemoMode()) {
    return verifyDemoWorkspaceDomain();
  }

  const canManageDomains = await isDomainManagementAvailable();
  if (canManageDomains) {
    return verifyWorkspaceSenderDomain(workspaceId);
  }

  const { supabase, user, workspaceId: activeWorkspaceId } = await getUserWorkspaceContext(
    undefined,
    workspaceId,
  );
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
  if (!supabase || !user || !targetWorkspaceId) {
    throw new Error("Unauthorized");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", targetWorkspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canEditWorkspace(membership?.role as WorkspaceRole | undefined)) {
    throw new Error("Only group owners and admins can verify send domains");
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(workspaceEmailColumns)
    .eq("id", targetWorkspaceId)
    .single();

  if (error || !workspace) {
    throw error ?? new Error("Workspace not found");
  }

  const domain = await resolveWorkspaceDomain(workspace);
  if (!domain) {
    throw new Error("Save a custom work email first");
  }

  const { data: updated, error: updateError } = await supabase
    .from("workspaces")
    .update({
      sender_domain: domain,
      sender_domain_status: "verified",
    })
    .eq("id", targetWorkspaceId)
    .select(workspaceEmailColumns)
    .single();

  if (updateError || !updated) {
    throw updateError ?? new Error("Failed to mark domain as verified");
  }

  return mapRow(updated, true);
}

export async function getWorkspaceEmailSettingsForSend(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  workspaceId: string,
): Promise<OutboundFromInputWithDomain> {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(`${workspaceEmailColumns}`)
    .eq("id", workspaceId)
    .single();

  if (error || !workspace) {
    return {
      mode: "platform",
      customSenderName: null,
      customSenderEmail: null,
      senderDomainStatus: "not_started",
    };
  }

  const synced = await autoSyncCustomDomain(supabase, workspaceId, workspace as WorkspaceEmailRow);

  return {
    mode: mapMode(synced.email_sender_mode),
    customSenderName: synced.custom_sender_name,
    customSenderEmail: synced.custom_sender_email,
    senderDomainStatus: (synced.sender_domain_status as SenderDomainStatus) ?? "not_started",
  };
}
