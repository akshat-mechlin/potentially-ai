export type ApolloPerson = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  last_name_obfuscated?: string | null;
  name?: string | null;
  title?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  seniority?: string | null;
  departments?: string[] | null;
  organization?: ApolloOrganization | null;
  organization_id?: string | null;
  phone_numbers?: Array<{ raw_number?: string; sanitized_number?: string; type?: string }> | null;
  last_refreshed_at?: string | null;
  has_email?: boolean | null;
  has_city?: boolean | null;
  has_state?: boolean | null;
  has_country?: boolean | null;
  has_direct_phone?: boolean | string | null;
  [key: string]: unknown;
};

export type ApolloOrganization = {
  id?: string;
  name?: string | null;
  website_url?: string | null;
  primary_domain?: string | null;
  linkedin_url?: string | null;
  industry?: string | null;
  keywords?: string[] | null;
  estimated_num_employees?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  annual_revenue?: number | null;
  total_funding?: number | null;
  latest_funding_stage?: string | null;
  latest_funding_round_date?: string | null;
  latest_funding_round_amount?: number | null;
  technologies?: string[] | null;
  has_industry?: boolean | null;
  has_phone?: boolean | null;
  has_city?: boolean | null;
  has_state?: boolean | null;
  has_country?: boolean | null;
  has_zip_code?: boolean | null;
  has_revenue?: boolean | null;
  has_employee_count?: boolean | null;
  [key: string]: unknown;
};

export type ApolloPeopleSearchFilters = {
  person_titles?: string[];
  person_seniorities?: string[];
  person_locations?: string[];
  organization_locations?: string[];
  q_organization_keyword_tags?: string[];
  q_keywords?: string[];
  organization_industry_tag_ids?: string[];
  page?: number;
  per_page?: number;
};

export type ApolloOrganizationSearchFilters = {
  q_organization_keyword_tags?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  q_organization_domains_list?: string[];
  page?: number;
  per_page?: number;
};

export type ApolloPeopleSearchResponse = {
  people?: ApolloPerson[];
  pagination?: {
    page?: number;
    per_page?: number;
    total_entries?: number;
    total_pages?: number;
  };
};

export type ApolloOrganizationSearchResponse = {
  organizations?: ApolloOrganization[];
  accounts?: ApolloOrganization[];
  pagination?: {
    page?: number;
    per_page?: number;
    total_entries?: number;
    total_pages?: number;
  };
};

export type ApolloPeopleEnrichmentResponse = {
  person?: ApolloPerson | null;
  status?: string;
};

export type ApolloOrganizationEnrichmentResponse = {
  organization?: ApolloOrganization | null;
};
