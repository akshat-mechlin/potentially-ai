"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { PublicNav } from "@/components/layout/public-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const plans = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    description: "For individuals getting started",
    features: [
      "500 contacts",
      "50 AI searches/month",
      "1 connected account",
      "Basic network graph",
      "Email support",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$49",
    description: "For professionals and small teams",
    features: [
      "10,000 contacts",
      "Unlimited AI searches",
      "5 connected accounts",
      "Full network graph",
      "AI outreach engine",
      "Team collaboration (5 seats)",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "Custom",
    description: "For organizations at scale",
    features: [
      "Unlimited contacts",
      "Unlimited AI searches",
      "Unlimited accounts",
      "Advanced analytics",
      "SSO & SAML",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: "free" | "pro" | "enterprise") => {
    if (planId === "free") return;

    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push("/login?redirect=/pricing");
        return;
      }

      if (!res.ok) throw new Error(data.error || "Checkout failed");

      if (data.mode === "stripe" && data.url) {
        globalThis.open(data.url, "_self", "noopener,noreferrer");
        return;
      }

      if (data.mode === "contact" && data.mailto) {
        globalThis.open(data.mailto, "_self", "noopener,noreferrer");
        return;
      }

      toast.message(data.message || "Contact support to complete your upgrade");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-36">
        <div className="text-center">
          <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free, upgrade when your network grows
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative border-border ${plan.popular ? "border-primary shadow-md" : ""}`}
            >
              <CardHeader>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground">
                    Most popular
                  </span>
                )}
                <CardTitle className="font-display text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="font-display text-4xl">{plan.price}</span>
                  {plan.price !== "Custom" && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.id === "free" ? (
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/signup">Get started</Link>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={loadingPlan === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {loadingPlan === plan.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {plan.id === "enterprise" ? "Contact sales" : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
