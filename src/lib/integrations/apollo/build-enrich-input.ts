import type { PlatformProspect } from "@/lib/data/platform-prospects";
import type { ApolloPeopleEnrichmentInput } from "@/lib/integrations/apollo/people-enrichment";
import {
  isObfuscatedDisplayName,
  isUnverifiedApolloStub,
} from "@/lib/integrations/apollo/present-record";
import type { ApolloPerson } from "@/lib/integrations/apollo/types";

function domainFromEmail(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const at = email.indexOf("@");
  if (at < 0) return undefined;
  return email.slice(at + 1).trim().toLowerCase() || undefined;
}

type EnrichableProspect = Pick<
  PlatformProspect,
  "apollo_id" | "name" | "email" | "company_name" | "primary_domain" | "linkedin_url" | "raw_apollo"
>;

/** Build Apollo enrichment input. Verified IDs use GET /people/{id}. */
export function buildPersonEnrichInput(prospect: EnrichableProspect): ApolloPeopleEnrichmentInput {
  const raw = prospect.raw_apollo as ApolloPerson;

  if (!isUnverifiedApolloStub(prospect.apollo_id)) {
    return {
      id: prospect.apollo_id,
      reveal_personal_emails: false,
    };
  }

  const name = isObfuscatedDisplayName(prospect.name) ? undefined : prospect.name;

  return {
    email: prospect.email ?? undefined,
    first_name: raw.first_name?.trim() || undefined,
    last_name: raw.last_name?.trim() || undefined,
    name,
    organization_name: prospect.company_name ?? undefined,
    domain: prospect.primary_domain ?? domainFromEmail(prospect.email),
    linkedin_url: prospect.linkedin_url ?? undefined,
  };
}
