"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, Loader2, Search, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApolloConnector } from "@/hooks/use-apollo-connector";
import {
  APOLLO_SENIORITY_OPTIONS,
  icpToApolloOrganizationFilterForm,
  icpToApolloPeopleFilterForm,
  organizationFormToFilters,
  peopleFormToFilters,
  type ApolloOrganizationFilterForm,
  type ApolloPeopleFilterForm,
} from "@/lib/integrations/apollo/icp-to-filters";
import type { ApolloOrganization, ApolloPerson } from "@/lib/integrations/apollo/types";
import { ApolloRecordCard } from "@/components/apollo/apollo-record-card";
import { playbookRunApiBase } from "@/lib/routes/playbook-runs";
import type { IcpProfile } from "@/types/playbooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMPTY_PEOPLE_FORM: ApolloPeopleFilterForm = {
  person_titles: "",
  person_seniorities: "",
  person_locations: "",
  organization_locations: "",
  q_organization_keyword_tags: "",
  q_keywords: "",
};

const EMPTY_ORG_FORM: ApolloOrganizationFilterForm = {
  q_organization_keyword_tags: "",
  organization_locations: "",
  q_organization_domains_list: "",
  organization_num_employees_ranges: "",
};

type SearchTab = "people" | "organizations";

type Pagination = {
  page?: number;
  per_page?: number;
  total_entries?: number;
  total_pages?: number;
};

export type ApolloSearchPanelProps = {
  /** Save selected people for a playbook run (Apollo tab only). */
  runId?: string;
  /** Prefill filters from playbook ICP. */
  icpProfile?: IcpProfile | null;
  compact?: boolean;
  onSaved?: () => void;
  /** @deprecated use onSaved */
  onImported?: () => void;
  className?: string;
};

function FilterField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function personKey(person: ApolloPerson) {
  return person.id ?? `${person.name ?? "unknown"}-${person.organization?.name ?? ""}`;
}

function orgKey(org: ApolloOrganization) {
  return org.id ?? `${org.name ?? "unknown"}-${org.primary_domain ?? ""}`;
}

export function ApolloSearchPanel({
  runId,
  icpProfile,
  compact,
  onSaved,
  onImported,
  className,
}: ApolloSearchPanelProps) {
  const { connected, connectHref, isLoading: connectorLoading } = useApolloConnector();
  const [tab, setTab] = useState<SearchTab>("people");
  const [peopleForm, setPeopleForm] = useState<ApolloPeopleFilterForm>(EMPTY_PEOPLE_FORM);
  const [orgForm, setOrgForm] = useState<ApolloOrganizationFilterForm>(EMPTY_ORG_FORM);
  const [peopleResults, setPeopleResults] = useState<ApolloPerson[]>([]);
  const [orgResults, setOrgResults] = useState<ApolloOrganization[]>([]);
  const [peoplePagination, setPeoplePagination] = useState<Pagination | null>(null);
  const [orgPagination, setOrgPagination] = useState<Pagination | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"search" | "save" | null>(null);

  const icpPrefillAvailable = Boolean(icpProfile);

  const applyIcpFilters = () => {
    if (!icpProfile) return;
    setPeopleForm(icpToApolloPeopleFilterForm(icpProfile));
    setOrgForm(icpToApolloOrganizationFilterForm(icpProfile));
    toast.success("Filters filled from playbook ICP");
  };

  const searchPeople = async (page = 1) => {
    setBusy("search");
    try {
      const filters = peopleFormToFilters(peopleForm, page);
      const res = await fetch("/api/apollo/people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "People search failed");
      setPeopleResults(data.people ?? []);
      setPeoplePagination(data.pagination ?? null);
      setSelectedPeople(new Set());
      toast.success(`Found ${data.people?.length ?? 0} people on page ${page}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "People search failed");
    } finally {
      setBusy(null);
    }
  };

  const searchOrganizations = async (page = 1) => {
    setBusy("search");
    try {
      const filters = organizationFormToFilters(orgForm, page);
      const res = await fetch("/api/apollo/organizations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Organization search failed");
      const orgs = data.organizations ?? data.accounts ?? [];
      setOrgResults(orgs);
      setOrgPagination(data.pagination ?? null);
      setSelectedOrgs(new Set());
      toast.success(`Found ${orgs.length} organizations on page ${page}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Organization search failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSearch = () => {
    if (tab === "people") void searchPeople(1);
    else void searchOrganizations(1);
  };

  const saveSelected = async () => {
    if (tab === "people") {
      const people = peopleResults.filter((person) => selectedPeople.has(personKey(person)));
      if (!people.length) {
        toast.error("Select at least one person to save.");
        return;
      }
      setBusy("save");
      try {
        if (runId) {
          const res = await fetch(`${playbookRunApiBase(runId)}/apollo-discover`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "import", people }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Save failed");
          toast.success(`Saved ${data.saved ?? 0} prospect(s) to Apollo`);
        } else {
          const res = await fetch("/api/apollo/records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ people, saved_from: "search" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Save failed");
          toast.success(`Saved ${data.saved ?? 0} record${data.saved === 1 ? "" : "s"} to Apollo`);
        }
        setSelectedPeople(new Set());
        onSaved?.();
        onImported?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      } finally {
        setBusy(null);
      }
      return;
    }

    const organizations = orgResults.filter((org) => selectedOrgs.has(orgKey(org)));
    if (!organizations.length) {
      toast.error("Select at least one organization to save.");
      return;
    }
    setBusy("save");
    try {
      const res = await fetch("/api/apollo/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizations, saved_from: "search" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(`Saved ${data.saved ?? 0} record${data.saved === 1 ? "" : "s"} to Apollo`);
      setSelectedOrgs(new Set());
      onSaved?.();
      onImported?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const activePagination = tab === "people" ? peoplePagination : orgPagination;
  const activePage = activePagination?.page ?? 1;
  const totalPages = activePagination?.total_pages ?? 1;
  const selectedCount = tab === "people" ? selectedPeople.size : selectedOrgs.size;

  const seniorityHint = useMemo(
    () => APOLLO_SENIORITY_OPTIONS.map((option) => option.value).join(", "),
    [],
  );

  if (connectorLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-sm text-muted-foreground">Loading Apollo connector...</CardContent>
      </Card>
    );
  }

  if (!connected) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="space-y-3 py-6">
          <p className="text-sm font-medium">Apollo search</p>
          <p className="text-sm text-muted-foreground">
            Connect your Apollo account to search people and organizations. Search uses your Apollo
            account.
          </p>
          <Button asChild size="sm">
            <Link href={connectHref}>Connect Apollo</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className={compact ? "text-base" : "text-lg"}>Apollo search</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Search Apollo people and organizations with filters. Search uses your Apollo account.
              Save stores records in your Apollo tab{runId ? " for this playbook" : ""}.
            </p>
          </div>
          {icpPrefillAvailable ? (
            <Button size="sm" variant="outline" onClick={applyIcpFilters} disabled={busy !== null}>
              Use playbook ICP
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as SearchTab)}>
          <TabsList>
            <TabsTrigger value="people">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              People
            </TabsTrigger>
            <TabsTrigger value="organizations">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              Organizations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FilterField
                id="apollo-person-titles"
                label="Job titles"
                hint="Comma-separated. Example: VP Sales, Head of Marketing"
                value={peopleForm.person_titles}
                onChange={(value) => setPeopleForm((prev) => ({ ...prev, person_titles: value }))}
                placeholder="VP Sales, Director of Engineering"
              />
              <FilterField
                id="apollo-person-seniorities"
                label="Seniority"
                hint={`Comma-separated Apollo values: ${seniorityHint}`}
                value={peopleForm.person_seniorities}
                onChange={(value) =>
                  setPeopleForm((prev) => ({ ...prev, person_seniorities: value }))
                }
                placeholder="director, vp, c_suite"
              />
              <FilterField
                id="apollo-person-locations"
                label="Person locations"
                hint="City, state, or country"
                value={peopleForm.person_locations}
                onChange={(value) =>
                  setPeopleForm((prev) => ({ ...prev, person_locations: value }))
                }
                placeholder="San Francisco, United States"
              />
              <FilterField
                id="apollo-org-locations"
                label="Company locations"
                value={peopleForm.organization_locations}
                onChange={(value) =>
                  setPeopleForm((prev) => ({ ...prev, organization_locations: value }))
                }
                placeholder="California, United Kingdom"
              />
              <FilterField
                id="apollo-org-keywords"
                label="Company keywords"
                value={peopleForm.q_organization_keyword_tags}
                onChange={(value) =>
                  setPeopleForm((prev) => ({ ...prev, q_organization_keyword_tags: value }))
                }
                placeholder="SaaS, fintech, healthcare"
              />
              <FilterField
                id="apollo-person-keywords"
                label="Person keywords"
                value={peopleForm.q_keywords}
                onChange={(value) => setPeopleForm((prev) => ({ ...prev, q_keywords: value }))}
                placeholder="sales, outbound, enterprise"
              />
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FilterField
                id="apollo-company-keywords"
                label="Company keywords"
                value={orgForm.q_organization_keyword_tags}
                onChange={(value) =>
                  setOrgForm((prev) => ({ ...prev, q_organization_keyword_tags: value }))
                }
                placeholder="SaaS, AI, logistics"
              />
              <FilterField
                id="apollo-company-locations"
                label="Company locations"
                value={orgForm.organization_locations}
                onChange={(value) =>
                  setOrgForm((prev) => ({ ...prev, organization_locations: value }))
                }
                placeholder="New York, Germany"
              />
              <FilterField
                id="apollo-company-domains"
                label="Domains"
                hint="Comma-separated domains without www"
                value={orgForm.q_organization_domains_list}
                onChange={(value) =>
                  setOrgForm((prev) => ({ ...prev, q_organization_domains_list: value }))
                }
                placeholder="apollo.io, stripe.com"
              />
              <FilterField
                id="apollo-company-size"
                label="Employee ranges"
                hint='Use Apollo format like "51,200" or "1000,5000"'
                value={orgForm.organization_num_employees_ranges}
                onChange={(value) =>
                  setOrgForm((prev) => ({ ...prev, organization_num_employees_ranges: value }))
                }
                placeholder="51,200, 1000,5000"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleSearch} disabled={busy !== null}>
            {busy === "search" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="mr-1.5 h-3.5 w-3.5" />
            )}
            Search
          </Button>
          {selectedCount > 0 ? (
            <Button size="sm" variant="secondary" onClick={saveSelected} disabled={busy !== null}>
              {busy === "save" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save {selectedCount} selected
            </Button>
          ) : null}
          {activePagination?.total_entries != null ? (
            <span className="text-xs text-muted-foreground">
              {activePagination.total_entries.toLocaleString()} total matches
            </span>
          ) : null}
        </div>

        {tab === "people" ? (
          peopleResults.length > 0 ? (
            <div className="space-y-2">
              {peopleResults.map((person) => {
                const id = personKey(person);
                return (
                  <ApolloRecordCard
                    key={id}
                    recordType="person"
                    data={person}
                    selectable
                    selected={selectedPeople.has(id)}
                    onSelectChange={(selected) =>
                      setSelectedPeople((prev) => {
                        const next = new Set(prev);
                        if (selected) next.add(id);
                        else next.delete(id);
                        return next;
                      })
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Set filters and search to preview Apollo people.
            </div>
          )
        ) : orgResults.length > 0 ? (
          <div className="space-y-2">
            {orgResults.map((org) => {
              const id = orgKey(org);
              return (
                <ApolloRecordCard
                  key={id}
                  recordType="organization"
                  data={org}
                  selectable
                  selected={selectedOrgs.has(id)}
                  onSelectChange={(selected) =>
                    setSelectedOrgs((prev) => {
                      const next = new Set(prev);
                      if (selected) next.add(id);
                      else next.delete(id);
                      return next;
                    })
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Set filters and search to preview Apollo organizations.
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || activePage <= 1}
              onClick={() => {
                if (tab === "people") void searchPeople(activePage - 1);
                else void searchOrganizations(activePage - 1);
              }}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {activePage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || activePage >= totalPages}
              onClick={() => {
                if (tab === "people") void searchPeople(activePage + 1);
                else void searchOrganizations(activePage + 1);
              }}
            >
              Next
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
