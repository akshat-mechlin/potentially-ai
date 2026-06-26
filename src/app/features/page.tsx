import { PublicNav } from "@/components/layout/public-nav";
import { Search, Network, Handshake, Zap, Shield, Users, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Natural Language Search",
    description:
      "Ask questions like 'Find founders connected to me' or 'Who can introduce me to Stripe?' and get ranked results with reasoning.",
  },
  {
    icon: Network,
    title: "Relationship Graph",
    description:
      "Interactive network visualization showing contacts, companies, emails, meetings, and mutual connections with path finding.",
  },
  {
    icon: Handshake,
    title: "Warm Introductions",
    description:
      "Discover introduction paths through your network. Request, track, and manage warm intros across your team.",
  },
  {
    icon: Zap,
    title: "AI Outreach Engine",
    description:
      "Generate personalized cold emails, warm intro requests, and LinkedIn messages with customizable tone and goals.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Row-level security, encrypted OAuth tokens, audit logs, and workspace isolation keep your data safe.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Shared workspaces with role-based access. Owners, admins, members, and viewers collaborate on relationship intelligence.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track searches, engagement, workspace growth, and AI usage. Understand how your team leverages their network.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Features</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to turn relationships into opportunities
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
