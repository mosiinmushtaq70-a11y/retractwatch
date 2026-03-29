import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  async rewrites() {
    return [];
  },
};

export default nextConfig;
