import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents / partialPrefetching disabled on purpose for the demo
  // (static JSON data, no need for PPR). See QA_NOTES.md.
  reactCompiler: true,
  // Native SQLite driver used by Prisma's libSQL adapter must not be bundled.
  serverExternalPackages: ["@libsql/client", "libsql", "@prisma/adapter-libsql"],
  // On Vercel the seeded SQLite file is built during `vercel-build` and shipped with every function
  // (lib/db.ts copies it to /tmp, the only writable path).
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
    "/**/*": ["./prisma/dev.db"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
