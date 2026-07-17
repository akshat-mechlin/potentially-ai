import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/docs-article";
import { DOC_PAGES, getDocPage } from "@/lib/docs/catalog";

export function generateStaticParams() {
  return DOC_PAGES.filter((page) => page.slug !== "overview").map((page) => ({
    slug: page.slug,
  }));
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "overview") notFound();

  const page = getDocPage(slug);
  if (!page) notFound();

  return <DocsArticle page={page} />;
}
