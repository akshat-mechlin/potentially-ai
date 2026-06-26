import Link from "next/link";
import { ArrowRight, Sparkles, Search, Network, Handshake, Zap } from "lucide-react";
import { PublicNav } from "@/components/layout/public-nav";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Search,
    title: "AI-Powered Search",
    description:
      "Ask natural language questions about your network. Find founders, CTOs, investors, and warm paths instantly.",
  },
  {
    icon: Network,
    title: "Relationship Graph",
    description:
      "Visualize your entire network. See connections, mutual contacts, and introduction paths at a glance.",
  },
  {
    icon: Handshake,
    title: "Warm Introductions",
    description:
      "Discover who can introduce you to anyone. Request intros and track outcomes across your team.",
  },
  {
    icon: Zap,
    title: "Smart Outreach",
    description:
      "Generate personalized emails, LinkedIn messages, and intro requests with AI that knows your context.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-powered relationship intelligence
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Your network is your
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              {" "}
              superpower
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Potentially.ai helps you search relationships, discover warm introductions, and
            generate outreach — powered by AI across your entire network.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/features">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold">Ready to unlock your network?</h2>
          <p className="mt-4 text-muted-foreground">
            Join teams using Potentially.ai to turn relationships into opportunities.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/signup">Start for free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
