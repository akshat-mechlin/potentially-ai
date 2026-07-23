import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/email/html";
import {
  PLATFORM_EMAIL_TEMPLATE_DEFAULTS,
  type PlatformEmailTemplateFields,
  type PlatformEmailTemplateKey,
  type PlatformEmailTemplateRow,
} from "@/lib/email/platform-email-defaults";
import {
  renderBrandedEmail,
  type BrandedEmailContent,
  type EmailPayload,
} from "@/lib/email/templates";

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  row: PlatformEmailTemplateFields;
};

const cache = new Map<PlatformEmailTemplateKey, CacheEntry>();

export function applyMergeTags(
  template: string,
  vars: Record<string, string | null | undefined>,
  options?: { escapeValues?: boolean },
): string {
  const escapeValues = options?.escapeValues !== false;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const raw = vars[key] ?? "";
    const value = raw == null ? "" : String(raw);
    return escapeValues ? escapeHtml(value) : value;
  });
}

function rowFromDb(data: Record<string, unknown>): PlatformEmailTemplateFields {
  return {
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    subject: String(data.subject ?? ""),
    preview: String(data.preview ?? ""),
    banner: data.banner == null ? null : String(data.banner),
    heading: String(data.heading ?? ""),
    greeting: data.greeting == null ? null : String(data.greeting),
    body: String(data.body ?? ""),
    quote_enabled: Boolean(data.quote_enabled),
    cta_label_on_platform: String(data.cta_label_on_platform ?? ""),
    cta_label_off_platform: String(data.cta_label_off_platform ?? ""),
    footer_note: data.footer_note == null ? null : String(data.footer_note),
    secondary_label_off_platform:
      data.secondary_label_off_platform == null
        ? null
        : String(data.secondary_label_off_platform),
  };
}

export function clearPlatformEmailTemplateCache(key?: PlatformEmailTemplateKey) {
  if (key) cache.delete(key);
  else cache.clear();
}

export async function getPlatformEmailTemplate(
  key: PlatformEmailTemplateKey,
): Promise<PlatformEmailTemplateFields> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.row;

  const fallback = PLATFORM_EMAIL_TEMPLATE_DEFAULTS[key];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_email_templates")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) {
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, row: fallback });
      return fallback;
    }
    const row = rowFromDb(data as Record<string, unknown>);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, row });
    return row;
  } catch {
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, row: fallback });
    return fallback;
  }
}

export async function listPlatformEmailTemplates(): Promise<PlatformEmailTemplateRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_email_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;

  const byKey = new Map(
    (data ?? []).map((row) => {
      const key = String((row as { key: string }).key) as PlatformEmailTemplateKey;
      return [key, row as Record<string, unknown>] as const;
    }),
  );

  return (Object.keys(PLATFORM_EMAIL_TEMPLATE_DEFAULTS) as PlatformEmailTemplateKey[]).map(
    (key) => {
      const db = byKey.get(key);
      const fields = db ? rowFromDb(db) : PLATFORM_EMAIL_TEMPLATE_DEFAULTS[key];
      return {
        key,
        ...fields,
        updated_at: db?.updated_at ? String(db.updated_at) : null,
        updated_by: db?.updated_by ? String(db.updated_by) : null,
      };
    },
  );
}

export type RenderPlatformEmailOptions = {
  vars: Record<string, string | null | undefined>;
  ctaUrl: string;
  onPlatform?: boolean;
  secondaryUrl?: string;
  quoteText?: string | null;
  /** When true, body merge tags are not HTML-escaped (template may include intentional markup). Vars still escaped. */
  showCopyLink?: boolean;
  /** Force hide banner even if template has one (e.g. chat on-platform). */
  forceHideBanner?: boolean;
  footerNoteOverride?: string | null;
};

export async function renderPlatformEmail(
  key: PlatformEmailTemplateKey,
  options: RenderPlatformEmailOptions,
): Promise<EmailPayload> {
  const tpl = await getPlatformEmailTemplate(key);
  const onPlatform = options.onPlatform !== false;
  const vars = options.vars;

  const subject = applyMergeTags(tpl.subject, vars);
  const preview = applyMergeTags(tpl.preview, vars);
  const heading = applyMergeTags(tpl.heading, vars);
  const greeting = tpl.greeting ? applyMergeTags(tpl.greeting, vars) : undefined;
  // Body may include intentional HTML around merge tags; escape only the interpolated values.
  const body = applyMergeTags(tpl.body, vars, { escapeValues: true });
  const footerNote = options.footerNoteOverride
    ? applyMergeTags(options.footerNoteOverride, vars)
    : tpl.footer_note
      ? applyMergeTags(tpl.footer_note, vars)
      : undefined;

  const ctaLabel = onPlatform
    ? applyMergeTags(tpl.cta_label_on_platform || tpl.cta_label_off_platform, vars)
    : applyMergeTags(tpl.cta_label_off_platform || tpl.cta_label_on_platform, vars);

  const secondaryLabel =
    !onPlatform && tpl.secondary_label_off_platform
      ? applyMergeTags(tpl.secondary_label_off_platform, vars)
      : undefined;

  let banner: string | null;
  if (options.forceHideBanner) banner = null;
  else if (tpl.banner == null) banner = null;
  else banner = applyMergeTags(tpl.banner, vars);

  const quoteHtml =
    tpl.quote_enabled && options.quoteText
      ? escapeHtml(options.quoteText).replace(/\r\n|\r|\n/g, "<br>")
      : undefined;

  const content: BrandedEmailContent = {
    preview,
    heading,
    greeting,
    body,
    quoteHtml,
    ctaLabel,
    ctaUrl: options.ctaUrl,
    secondaryLabel,
    secondaryUrl: secondaryLabel ? options.secondaryUrl : undefined,
    footerNote,
    banner,
    showCopyLink: options.showCopyLink,
  };

  return {
    subject,
    html: renderBrandedEmail(content),
  };
}

export async function renderOutreachMarketingFooter(input: {
  inviteOrOpenUrl: string | null;
  onPlatform: boolean;
  unsubscribeUrl: string;
}): Promise<string> {
  const tpl = await getPlatformEmailTemplate("outreach_marketing_footer");
  const COLORS = {
    forest: "#2D4739",
    muted: "#6B7280",
    border: "#D8DCD4",
  };
  const FONT_SERIF = '"DM Serif Display", Georgia, "Times New Roman", serif';
  const FONT_SANS =
    "'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const heading = escapeHtml(tpl.heading);
  const tagline = escapeHtml(tpl.body);
  const ctaLabel = escapeHtml(
    input.onPlatform ? tpl.cta_label_on_platform : tpl.cta_label_off_platform,
  );
  const prompt = tpl.footer_note ? escapeHtml(tpl.footer_note) : "";

  const inviteBlock = input.inviteOrOpenUrl
    ? input.onPlatform
      ? `<p style="margin:12px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.5;color:${COLORS.muted};">
           <a href="${input.inviteOrOpenUrl}" style="color:${COLORS.forest};text-decoration:underline;">${ctaLabel}</a>
         </p>`
      : `<p style="margin:12px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.5;color:${COLORS.muted};">
           ${prompt ? `${prompt} ` : ""}
           <a href="${input.inviteOrOpenUrl}" style="color:${COLORS.forest};text-decoration:underline;font-weight:500;">${ctaLabel}</a>
         </p>`
    : "";

  return `
<div style="margin-top:36px;padding-top:20px;border-top:1px solid ${COLORS.border};">
  <table role="presentation" cellspacing="0" cellpadding="0">
    <tr>
      <td style="vertical-align:middle;line-height:0;padding-right:10px;">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#2D4739"/>
          <path d="M9 17.5C9 17.5 12.5 11.5 16 11.5C19.5 11.5 23 17.5 23 17.5" stroke="#F9F8F4" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="16" cy="10.5" r="2.75" fill="#F9F8F4"/>
          <circle cx="8.5" cy="18.5" r="3.25" fill="#F9F8F4"/>
          <circle cx="23.5" cy="18.5" r="3.25" fill="#F9F8F4"/>
        </svg>
      </td>
      <td style="vertical-align:middle;">
        <p style="margin:0;font-family:${FONT_SERIF};font-size:14px;color:${COLORS.forest};">${heading}</p>
        <p style="margin:2px 0 0;font-family:${FONT_SANS};font-size:11px;color:${COLORS.muted};">${tagline}</p>
      </td>
    </tr>
  </table>
  ${inviteBlock}
  <p style="margin:14px 0 0;font-family:${FONT_SANS};font-size:11px;color:${COLORS.muted};">
    <a href="${input.unsubscribeUrl}" style="color:${COLORS.muted};text-decoration:underline;">Unsubscribe</a>
  </p>
</div>`;
}
