import type { DocBlock, DocPage, DocSection } from "@/lib/docs/types";
import { docHref } from "@/lib/docs/types";
import { quickStartsSection } from "@/lib/docs/sections/quick-starts";
import { connectorsSection } from "@/lib/docs/sections/connectors";
import { contactsSection, searchNetworkSection } from "@/lib/docs/sections/search-contacts";
import { agentModeSection, groupsSection } from "@/lib/docs/sections/groups-agent";
import {
  analyticsSettingsSection,
  billingAdminSection,
} from "@/lib/docs/sections/settings-billing";

export type { DocBlock, DocPage, DocSection };
export { docHref };

export const DOC_SECTIONS: DocSection[] = [
  quickStartsSection,
  connectorsSection,
  searchNetworkSection,
  contactsSection,
  groupsSection,
  agentModeSection,
  analyticsSettingsSection,
  billingAdminSection,
];

export const DOC_PAGES: DocPage[] = DOC_SECTIONS.flatMap((section) => section.pages);

export function getDocPage(slug: string): DocPage | undefined {
  return DOC_PAGES.find((page) => page.slug === slug);
}

export function getDocTitle(slug: string): string | undefined {
  return getDocPage(slug)?.title;
}

export function getDocToc(page: DocPage): Array<{ id: string; text: string; level: 2 | 3 }> {
  return page.blocks
    .filter((block): block is Extract<DocBlock, { type: "heading" }> => block.type === "heading")
    .map((block) => ({
      id: block.id,
      text: block.text,
      level: block.level ?? 2,
    }));
}

export function getAdjacentDocs(slug: string): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const index = DOC_PAGES.findIndex((page) => page.slug === slug);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: index > 0 ? DOC_PAGES[index - 1] : null,
    next: index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : null,
  };
}
