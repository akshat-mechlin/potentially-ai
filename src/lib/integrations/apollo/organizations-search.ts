import { apolloApiRequest } from "@/lib/integrations/apollo/client";
import type {
  ApolloOrganizationSearchFilters,
  ApolloOrganizationSearchResponse,
} from "@/lib/integrations/apollo/types";

export async function searchApolloOrganizations(
  accessToken: string,
  filters: ApolloOrganizationSearchFilters,
): Promise<ApolloOrganizationSearchResponse> {
  return apolloApiRequest<ApolloOrganizationSearchResponse>("/mixed_companies/search", {
    accessToken,
    method: "POST",
    params: {
      q_organization_keyword_tags: filters.q_organization_keyword_tags,
      organization_locations: filters.organization_locations,
      organization_num_employees_ranges: filters.organization_num_employees_ranges,
      q_organization_domains_list: filters.q_organization_domains_list,
      page: filters.page ?? 1,
      per_page: Math.min(filters.per_page ?? 25, 100),
    },
  });
}
