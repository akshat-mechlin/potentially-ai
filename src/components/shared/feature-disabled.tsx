export function FeatureDisabled({
  title,
  flag,
}: {
  title: string;
  flag: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm font-medium">{title} is disabled</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Enable the <code className="text-xs">{flag}</code> feature flag in Admin to use this.
      </p>
    </div>
  );
}
