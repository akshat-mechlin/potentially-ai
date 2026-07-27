import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichApolloRecords } from "@/lib/data/apollo-records";
import { getContact } from "@/lib/data/contacts";
import { logAuditEvent } from "@/lib/data/audit";
import { withApolloAccount } from "@/lib/integrations/apollo/client";
import { enrichApolloPerson } from "@/lib/integrations/apollo/people-enrichment";
import { mapApolloPersonToImportRow } from "@/lib/integrations/apollo/map-to-contact";
import { importContactsFromSource } from "@/lib/data/contacts";
import { apolloErrorResponse, ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

const schema = z.object({
  account_id: z.string().uuid().optional(),
  record_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  name: z.string().optional(),
  organization_name: z.string().optional(),
  domain: z.string().optional(),
  linkedin_url: z.string().optional(),
  reveal_personal_emails: z.boolean().optional(),
  apply_to_contact: z.boolean().optional(),
  promote: z.boolean().optional(),
  acknowledge_unverified: z.boolean().optional(),
});

function domainFromEmail(email: string | null | undefined) {
  if (!email) return undefined;
  const at = email.indexOf("@");
  if (at < 0) return undefined;
  return email.slice(at + 1).trim().toLowerCase() || undefined;
}

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = schema.parse(await request.json());

    if (body.record_id) {
      const results = await enrichApolloRecords({
        ids: [body.record_id],
        acknowledgeUnverified: body.acknowledge_unverified,
        accountId: body.account_id,
      });
      const result = results[0];
      if (!result) {
        return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
      }

      if (body.promote && result.status === "enriched" && result.prospect) {
        const { promoteApolloRecordsToContacts } = await import("@/lib/data/apollo-records");
        await promoteApolloRecordsToContacts([result.prospect.id]);
      }

      return NextResponse.json({ result, results });
    }

    let enrichInput = {
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      name: body.name,
      organization_name: body.organization_name,
      domain: body.domain,
      linkedin_url: body.linkedin_url,
      reveal_personal_emails: body.reveal_personal_emails,
    };

    if (body.contact_id) {
      const contact = await getContact(body.contact_id);
      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      enrichInput = {
        email: enrichInput.email ?? contact.email ?? undefined,
        first_name: enrichInput.first_name ?? contact.first_name ?? undefined,
        last_name: enrichInput.last_name ?? contact.last_name ?? undefined,
        name: enrichInput.name ?? contact.full_name ?? undefined,
        organization_name: enrichInput.organization_name ?? contact.company_name ?? undefined,
        domain: enrichInput.domain ?? domainFromEmail(contact.email),
        linkedin_url: enrichInput.linkedin_url ?? contact.linkedin_url ?? undefined,
        reveal_personal_emails: enrichInput.reveal_personal_emails,
      };
    }

    const result = await withApolloAccount(body.account_id, async ({ accessToken }) =>
      enrichApolloPerson(accessToken, enrichInput),
    );

    let importResult: { imported: number; updated: number } | null = null;
    if (body.promote === true && body.contact_id && result.person) {
      const row = mapApolloPersonToImportRow(result.person);
      if (row) {
        importResult = await importContactsFromSource([row], "apollo");
        await logAuditEvent("apollo.contact_enriched", "contact", body.contact_id, {
          apollo_person_id: result.person.id ?? null,
        });
      }
    }

    return NextResponse.json({
      ...result,
      import: importResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apolloErrorResponse(error);
  }
}
