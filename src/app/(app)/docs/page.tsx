import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/docs-article";
import { getDocPage } from "@/lib/docs/catalog";

export default function DocsIndexPage() {
  const page = getDocPage("overview");
  if (!page) notFound();
  return <DocsArticle page={page} />;
}
