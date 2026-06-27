import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
  stepLabel?: string;
}

export function AuthShell({ children, step, totalSteps, stepLabel }: AuthShellProps) {
  const showProgress = step !== undefined && totalSteps !== undefined;

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:py-10">
      <div className="mx-auto max-w-lg">
        {showProgress && (
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between font-ui text-xs text-muted-foreground">
              <span>
                Step {step} of {totalSteps}
                {stepLabel ? ` · ${stepLabel}` : ""}
              </span>
              <span>{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="mb-8 flex justify-center">
          <BrandLogo href="/" size="lg" />
        </div>

        <div className={cn("rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8")}>
          {children}
        </div>
      </div>
    </div>
  );
}
