import Link from "next/link";
import { ArrowRight, Search, Network, Handshake, Zap } from "lucide-react";
import { PublicNav } from "@/components/layout/public-nav";
import { HeroBackground } from "@/components/layout/hero-background";
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
    <div className="min-h-[100dvh] bg-background">
      <PublicNav />

      <section className="relative flex min-h-[calc(100dvh-5.5rem)] flex-col justify-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <HeroBackground />
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="max-w-xl lg:max-w-2xl">
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Your network is your superpower
            </h1>
            <p className="text-lead mt-5 max-w-lg text-foreground/90">
              Potentially helps teams search relationships, find warm introductions, and write
              outreach that sounds like a real person, not a mail merge.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild className="h-12 rounded-lg px-8 text-base shadow-sm">
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 rounded-lg border-border/80 bg-card/60 px-8 text-base backdrop-blur-sm"
              >
                <Link href="/features">See how it works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-background py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-display text-4xl text-foreground sm:text-5xl">
            Built for relationship builders
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-foreground/90 sm:text-xl">
            Turn your professional network into a strategic advantage with AI-powered search,
            warm introductions, and outreach.
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border/60 py-20">
        <div className="absolute inset-0 -z-10 bg-secondary/25" />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl text-foreground sm:text-5xl">
            Ready to unlock your network?
          </h2>
          <p className="mt-3 text-sub text-muted-foreground">
            Join teams using Potentially to turn relationships into opportunities.
          </p>
          <Button size="lg" className="mt-8 h-12 rounded-lg px-8" asChild>
            <Link href="/signup">Start for free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
