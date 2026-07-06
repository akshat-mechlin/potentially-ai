export type PlanId = "free" | "pro" | "enterprise";

export interface PlanLimits {
  id: PlanId;
  name: string;
  maxContacts: number;
  maxSearchesPerMonth: number;
  maxConnectedAccounts: number;
  priceMonthly: number | null;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    maxContacts: 500,
    maxSearchesPerMonth: 50,
    maxConnectedAccounts: 1,
    priceMonthly: 0,
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxContacts: 10_000,
    maxSearchesPerMonth: Number.POSITIVE_INFINITY,
    maxConnectedAccounts: 5,
    priceMonthly: 49,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    maxContacts: Number.POSITIVE_INFINITY,
    maxSearchesPerMonth: Number.POSITIVE_INFINITY,
    maxConnectedAccounts: Number.POSITIVE_INFINITY,
    priceMonthly: null,
  },
};

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "pro" || plan === "enterprise") return plan;
  return "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLANS[normalizePlan(plan)];
}
