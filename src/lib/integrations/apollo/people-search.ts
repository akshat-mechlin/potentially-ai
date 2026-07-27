import { apolloApiRequest } from "@/lib/integrations/apollo/client";
import { joinApolloFilterInput } from "@/lib/integrations/apollo/icp-to-filters";
import type {
  ApolloPeopleSearchFilters,
  ApolloPeopleSearchResponse,
} from "@/lib/integrations/apollo/types";

/** Apollo expects q_keywords as a single string, not person_titles-style arrays. */
export function apolloPeopleSearchRequestParams(filters: ApolloPeopleSearchFilters) {
  return {
    person_titles: filters.person_titles,
    person_seniorities: filters.person_seniorities,
    person_locations: filters.person_locations,
    organization_locations: filters.organization_locations,
    q_organization_keyword_tags: filters.q_organization_keyword_tags,
    q_keywords: filters.q_keywords?.length ? joinApolloFilterInput(filters.q_keywords) : undefined,
    page: filters.page ?? 1,
    per_page: Math.min(filters.per_page ?? 25, 100),
  };
}

export async function searchApolloPeople(
  accessToken: string,
  filters: ApolloPeopleSearchFilters,
): Promise<ApolloPeopleSearchResponse> {
  const params = apolloPeopleSearchRequestParams(filters);
  console.log("[Apollo API] Sending request params:", JSON.stringify(params, null, 2));
  
  return apolloApiRequest<ApolloPeopleSearchResponse>("/mixed_people/api_search", {
    accessToken,
    method: "POST",
    params,
  });
}
