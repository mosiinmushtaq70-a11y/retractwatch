import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  outputFileTracingExcludes: {
    "*": ["./data/retraction_watch.csv"],
  },
  async rewrites() {
    return [];
  },
};

export default nextConfig;
