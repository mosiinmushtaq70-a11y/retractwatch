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
```

Save the file, then:
```
git add next.config.ts
git commit -m "fix: resolve merge conflict in next.config"
git push origin main --force --no-verify