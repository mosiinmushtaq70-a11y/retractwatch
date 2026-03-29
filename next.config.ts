import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Directory containing this config (`web/`) — correct file tracing when repo has multiple lockfiles. */
const webRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
<<<<<<< HEAD
  outputFileTracingRoot: webRoot,
  // Keep local app/api routes local. Rewriting to localhost:3000 from the same
  // app causes self-proxy loops and hung requests in single-app dev setup.
=======
  outputFileTracingExcludes: {
    "*": ["./data/retraction_watch.csv"],
  },
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  // Proxy /api/* to the backend Next.js app running on port 3000
>>>>>>> 747d616 (fix: exclude CSV from build bundle)
  async rewrites() {
    return [];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid disk cache allocation spikes on constrained Windows environments.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
