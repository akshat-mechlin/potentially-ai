export type DocBlock =
  | { type: "heading"; id: string; text: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "callout"; title: string; body: string; items?: string[] }
  | { type: "tip"; text: string }
  | { type: "screenshot"; src: string; alt: string; caption: string }
  | { type: "links"; title?: string; items: Array<{ slug: string; label: string; description?: string }> };

export type DocPage = {
  slug: string;
  title: string;
  section: string;
  description: string;
  blocks: DocBlock[];
};

export type DocSection = {
  id: string;
  title: string;
  pages: DocPage[];
};

export function docHref(slug: string) {
  return slug === "overview" ? "/docs" : `/docs/${slug}`;
}

export function page(
  slug: string,
  title: string,
  section: string,
  description: string,
  blocks: DocBlock[],
): DocPage {
  return { slug, title, section, description, blocks };
}
