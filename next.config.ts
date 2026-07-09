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
    ];
  },
  headers: async () => [
    {
      source: "/api/auth/:path*",
      headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
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
