import { findPlatformUserByEmail } from "@/lib/data/platform-users";
import { appBaseUrl, buildSignupInviteUrl } from "@/lib/email/html";

export type EmailAudienceCta = {
  onPlatform: boolean;
  ctaLabel: string;
  ctaUrl: string;
  /** Secondary link for off-platform emails (e.g. already have an account). */
  secondaryLabel?: string;
  secondaryUrl?: string;
};

/**
 * Resolve primary CTA by whether the recipient already has a Potentially account.
 * Off-platform → invite/signup with redirect. On-platform → deep link into the app.
 */
export async function buildAudienceCta(input: {
  email: string | null | undefined;
  deepLinkPath: string;
  onPlatformLabel: string;
  offPlatformLabel: string;
  /** When off-platform, optional secondary “already have an account” link. */
  secondaryOnPlatformLabel?: string;
}): Promise<EmailAudienceCta> {
  const path = input.deepLinkPath.startsWith("/")
    ? input.deepLinkPath
    : `/${input.deepLinkPath}`;
  const deepLink = `${appBaseUrl()}${path}`;
  const match = await findPlatformUserByEmail(input.email);

  if (match) {
    return {
      onPlatform: true,
      ctaLabel: input.onPlatformLabel,
      ctaUrl: deepLink,
    };
  }

  const email = input.email?.trim() ?? "";
  return {
    onPlatform: false,
    ctaLabel: input.offPlatformLabel,
    ctaUrl: email ? buildSignupInviteUrl(email, path) : `${appBaseUrl()}/signup`,
    secondaryLabel: input.secondaryOnPlatformLabel,
    secondaryUrl: input.secondaryOnPlatformLabel ? deepLink : undefined,
  };
}
