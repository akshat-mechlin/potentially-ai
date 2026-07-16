import Link from "next/link";
import type { DocPage } from "@/lib/docs/catalog";
import { docHref, getAdjacentDocs, getDocToc } from "@/lib/docs/catalog";
import { DocCallout } from "@/components/docs/doc-callout";
import { DocScreenshot } from "@/components/docs/doc-screenshot";
import { DocsToc } from "@/components/docs/docs-toc";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function DocsArticle({ page }: { page: DocPage }) {
  const toc = getDocToc(page);
  const { prev, next } = getAdjacentDocs(page.slug);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_18rem]">
      <article className="min-w-0">
        <p className="text-sm font-medium text-primary">{page.section}</p>
        <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
          {page.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground lg:max-w-4xl">
          {page.description}
        </p>

        <div className="mt-8 space-y-6 lg:space-y-8">
          {page.blocks.map((block, index) => {
            if (block.type === "heading") {
              const Tag = block.level === 3 ? "h3" : "h2";
              return (
                <Tag
                  key={`${block.id}-${index}`}
                  id={block.id}
                  className="scroll-mt-24 font-display text-xl text-foreground sm:text-2xl"
                >
                  {block.text}
                </Tag>
              );
            }

            if (block.type === "paragraph") {
              return (
                <p
                  key={`p-${index}`}
                  className="max-w-3xl text-sm leading-relaxed text-foreground/90 sm:text-base lg:max-w-4xl"
                >
                  {block.text}
                </p>
              );
            }

            if (block.type === "steps") {
              return (
                <ol key={`steps-${index}`} className="max-w-3xl space-y-3 lg:max-w-4xl">
                  {block.items.map((item, stepIndex) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed sm:text-base">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                        {stepIndex + 1}
                      </span>
                      <span className="pt-0.5 text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ol>
              );
            }

            if (block.type === "callout") {
              return (
                <div key={`callout-${index}`} className="max-w-3xl lg:max-w-4xl">
                  <DocCallout title={block.title} body={block.body} items={block.items} />
                </div>
              );
            }

            if (block.type === "tip") {
              return (
                <p
                  key={`tip-${index}`}
                  className="max-w-3xl rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground lg:max-w-4xl"
                >
                  <span className="font-medium text-foreground">Tip. </span>
                  {block.text}
                </p>
              );
            }

            if (block.type === "screenshot") {
              return (
                <DocScreenshot
                  key={`shot-${index}`}
                  src={block.src}
                  alt={block.alt}
                  caption={block.caption}
                />
              );
            }

            if (block.type === "links") {
              return (
                <div key={`links-${index}`} className="max-w-3xl space-y-3 lg:max-w-4xl">
                  {block.title ? (
                    <p className="text-sm font-semibold text-foreground">{block.title}</p>
                  ) : null}
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {block.items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={docHref(item.slug)}
                          className="block rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-secondary/60"
                        >
                          <span className="text-sm font-medium text-primary">{item.label}</span>
                          {item.description ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            return null;
          })}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          {prev ? (
            <Link
              href={docHref(prev.slug)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={docHref(next.slug)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground sm:ml-auto"
            >
              {next.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <DocsToc items={toc} />
        </div>
      </aside>
    </div>
  );
}
