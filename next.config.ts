import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/playbooks/:playbookId/runs/:runId",
        destination: "/playbook-runs/:runId",
      },
      {
        source: "/contacts/:id",
        destination: "/contact/:id",
      },
      // Nested /api/playbooks/runs/[runId]/* 404s under /api/playbooks/[id] in Next 16 — flatten.
      {
        source: "/api/playbooks/runs/:runId",
        destination: "/api/playbook-runs/:runId",
      },
      {
        source: "/api/playbooks/runs/:runId/:path*",
        destination: "/api/playbook-runs/:runId/:path*",
      },
    ];
  },
  headers: async () => [
    {
      source: "/api/auth/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/login",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/signup",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/forgot-password",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/reset-password",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/",
      headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }],
    },
    {
      source: "/pricing",
      headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }],
    },
    {
      source: "/features",
      headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }],
    },
  ],
};

export default nextConfig;
