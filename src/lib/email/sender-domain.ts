import { Resend } from "resend";
import type { DomainRecords, DomainStatus } from "resend";

export type SenderDomainStatus = "not_started" | "pending" | "verified" | "failed";

export interface DnsRecordRow {
  type: string;
  name: string;
  value: string;
  status: string;
  record: string;
}

export interface WorkspaceDomainSetup {
  domain: string | null;
  status: SenderDomainStatus;
  records: DnsRecordRow[];
  resendConfigured: boolean;
  domainManagementAvailable: boolean;
}

export interface SyncedSenderDomain {
  domainId: string;
  domain: string;
  status: SenderDomainStatus;
  records: DnsRecordRow[];
}

let domainManagementCache: boolean | null = null;

export function resetDomainManagementCache() {
  domainManagementCache = null;
}

function getResendSendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("re_your")) return null;
  return new Resend(apiKey);
}

function getResendDomainClient() {
  const apiKey = process.env.RESEND_DOMAIN_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("re_your")) return null;
  return new Resend(apiKey);
}

export function isResendDomainApiRestrictedError(message: string) {
  return message.toLowerCase().includes("restricted to only send");
}

export function formatResendDomainError(message: string) {
  if (isResendDomainApiRestrictedError(message)) {
    return "Automatic domain setup requires a full-access Resend API key. Configure the domain in Resend manually, then mark it verified below.";
  }
  return message;
}

export async function isDomainManagementAvailable() {
  if (process.env.RESEND_DOMAIN_API_KEY) return true;

  if (domainManagementCache === true) return true;

  const resend = getResendDomainClient();
  if (!resend) return false;

  const { error } = await resend.domains.list();
  if (error && isResendDomainApiRestrictedError(error.message)) {
    domainManagementCache = false;
    return false;
  }

  if (!error) {
    domainManagementCache = true;
    return true;
  }

  return false;
}

function mapRecords(records: DomainRecords[] | undefined): DnsRecordRow[] {
  return (records ?? []).map((row) => ({
    type: row.type,
    name: row.name,
    value: row.value,
    status: row.status,
    record: row.record,
  }));
}

function mapDomainStatus(status: DomainStatus | undefined): SenderDomainStatus {
  if (status === "verified") return "verified";
  if (status === "failed" || status === "partially_failed") return "failed";
  if (status === "pending" || status === "partially_verified") return "pending";
  return "not_started";
}

function getPlatformSenderDomainFromEnv() {
  const from = process.env.EMAIL_FROM || "Potentially <onboarding@resend.dev>";
  const match = from.match(/@([^>@]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function toSyncedSenderDomain(data: {
  id: string;
  name: string;
  status: DomainStatus;
  records?: DomainRecords[];
}): SyncedSenderDomain {
  return {
    domainId: data.id,
    domain: data.name,
    status: mapDomainStatus(data.status),
    records: mapRecords(data.records),
  };
}

export function extractDomainFromEmail(email: string) {
  const match = email.trim().toLowerCase().match(/@([^@]+)$/);
  return match?.[1] ?? null;
}

export function isPublicEmailDomain(domain: string) {
  const blocked = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "me.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
  ]);
  return blocked.has(domain.toLowerCase());
}

export function isPlatformSenderDomain(domain: string) {
  const platformDomain = getPlatformSenderDomainFromEnv();
  return Boolean(platformDomain && platformDomain === domain.trim().toLowerCase());
}

export async function getWorkspaceDomainSetup(input: {
  domain: string | null;
  resendDomainId: string | null;
  storedStatus: SenderDomainStatus;
}): Promise<WorkspaceDomainSetup> {
  const resendConfigured = Boolean(getResendSendClient());
  const domainManagementAvailable = await isDomainManagementAvailable();
  const resend = domainManagementAvailable ? getResendDomainClient() : null;

  if (!resend || !input.domain) {
    return {
      domain: input.domain,
      status: input.storedStatus,
      records: [],
      resendConfigured,
      domainManagementAvailable,
    };
  }

  try {
    if (input.resendDomainId) {
      const { data, error } = await resend.domains.get(input.resendDomainId);
      if (!error && data) {
        return {
          domain: data.name,
          status: mapDomainStatus(data.status),
          records: mapRecords(data.records),
          resendConfigured,
          domainManagementAvailable,
        };
      }
    }

    const { data: listed, error: listError } = await resend.domains.list();
    if (listError) {
      throw new Error(listError.message);
    }

    const existing = listed?.data?.find(
      (row) => row.name.toLowerCase() === input.domain!.toLowerCase(),
    );
    if (existing) {
      const { data } = await resend.domains.get(existing.id);
      return {
        domain: existing.name,
        status: mapDomainStatus(data?.status ?? existing.status),
        records: mapRecords(data?.records),
        resendConfigured,
        domainManagementAvailable,
      };
    }
  } catch (error) {
    console.warn("Domain setup lookup failed:", error);
  }

  return {
    domain: input.domain,
    status: input.storedStatus,
    records: [],
    resendConfigured,
    domainManagementAvailable,
  };
}

export async function createOrRefreshWorkspaceDomain(domain: string): Promise<SyncedSenderDomain> {
  const available = await isDomainManagementAvailable();
  if (!available) {
    throw new Error(formatResendDomainError("This API key is restricted to only send emails"));
  }

  const resend = getResendDomainClient();
  if (!resend) {
    throw new Error("Email service is not configured on this server");
  }

  const normalized = domain.trim().toLowerCase();
  if (isPublicEmailDomain(normalized)) {
    throw new Error(
      "Use a work domain (e.g. yourcompany.com). Gmail and Outlook addresses cannot be verified as send domains.",
    );
  }

  const { data: listed, error: listError } = await resend.domains.list();
  if (listError) {
    throw new Error(formatResendDomainError(listError.message));
  }

  const existing = listed?.data?.find((row) => row.name.toLowerCase() === normalized);

  if (existing) {
    const { data, error } = await resend.domains.get(existing.id);
    if (error || !data) throw new Error(formatResendDomainError(error?.message ?? "Failed to load domain"));
    return toSyncedSenderDomain(data);
  }

  const { data, error } = await resend.domains.create({ name: normalized });
  if (error || !data) {
    throw new Error(formatResendDomainError(error?.message ?? "Failed to create domain in Resend"));
  }

  return toSyncedSenderDomain(data);
}

export async function verifyWorkspaceDomain(domainId: string): Promise<SyncedSenderDomain> {
  const available = await isDomainManagementAvailable();
  if (!available) {
    throw new Error(formatResendDomainError("This API key is restricted to only send emails"));
  }

  const resend = getResendDomainClient();
  if (!resend) {
    throw new Error("Email service is not configured on this server");
  }

  const { error } = await resend.domains.verify(domainId);
  if (error) {
    throw new Error(formatResendDomainError(error.message));
  }

  const { data, error: fetchError } = await resend.domains.get(domainId);
  if (fetchError || !data) {
    throw new Error(formatResendDomainError(fetchError?.message ?? "Failed to refresh domain status"));
  }

  return toSyncedSenderDomain(data);
}

export async function syncSenderDomainWithResend(domain: string): Promise<SyncedSenderDomain> {
  const refreshed = await createOrRefreshWorkspaceDomain(domain);
  if (refreshed.status === "verified") {
    return refreshed;
  }

  try {
    return await verifyWorkspaceDomain(refreshed.domainId);
  } catch {
    return refreshed;
  }
}

export const RESEND_DOMAINS_URL = "https://resend.com/domains";
