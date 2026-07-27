import { apolloApiRequest } from "@/lib/integrations/apollo/client";
import type { ApolloOrganizationEnrichmentResponse } from "@/lib/integrations/apollo/types";

export type ApolloOrganizationEnrichmentInput = {
  domain?: string;
  name?: string;
};

export async function enrichApolloOrganization(
  accessToken: string,
  input: ApolloOrganizationEnrichmentInput,
): Promise<ApolloOrganizationEnrichmentResponse> {
  return apolloApiRequest<ApolloOrganizationEnrichmentResponse>("/organizations/enrich", {
    accessToken,
    method: "GET",
    params: {
      domain: input.domain,
      name: input.name,
    },
  });
}
