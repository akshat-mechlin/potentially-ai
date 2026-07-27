import { apolloApiRequest } from "@/lib/integrations/apollo/client";
import type {
  ApolloPeopleEnrichmentResponse,
  ApolloPerson,
} from "@/lib/integrations/apollo/types";

export type ApolloPeopleEnrichmentInput = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  organization_name?: string;
  domain?: string;
  linkedin_url?: string;
  reveal_personal_emails?: boolean;
};

function personFromByIdResponse(
  result: ApolloPeopleEnrichmentResponse | ApolloPerson,
): ApolloPerson | null {
  if ("person" in result && result.person) {
    return result.person as ApolloPerson;
  }
  if ("id" in result && result.id) {
    return result as ApolloPerson;
  }
  return null;
}

async function enrichApolloPersonById(
  accessToken: string,
  apolloId: string,
): Promise<ApolloPeopleEnrichmentResponse> {
  const result = await apolloApiRequest<ApolloPeopleEnrichmentResponse | ApolloPerson>(
    `/people/${encodeURIComponent(apolloId)}`,
    {
      accessToken,
      method: "GET",
    },
  );

  return {
    person: personFromByIdResponse(result),
  };
}

export async function enrichApolloPerson(
  accessToken: string,
  input: ApolloPeopleEnrichmentInput,
): Promise<ApolloPeopleEnrichmentResponse> {
  if (input.id) {
    return enrichApolloPersonById(accessToken, input.id);
  }

  return apolloApiRequest<ApolloPeopleEnrichmentResponse>("/people/match", {
    accessToken,
    method: "POST",
    params: {
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      name: input.name,
      organization_name: input.organization_name,
      domain: input.domain,
      linkedin_url: input.linkedin_url,
      reveal_personal_emails: input.reveal_personal_emails ?? false,
    },
  });
}
