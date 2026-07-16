import { Pin } from "lucide-react";

export function DocCallout({
  title,
  body,
  items,
}: {
  title: string;
  body: string;
  items?: string[];
}) {
  return (
    <aside className="rounded-xl border border-primary/20 bg-secondary/50 p-4">
      <div className="flex items-start gap-2">
        <Pin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          {items?.length ? (
            <ul className="space-y-1.5 pl-1">
              {items.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
