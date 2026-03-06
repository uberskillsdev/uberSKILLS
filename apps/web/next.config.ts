import path from "node:path";
import type { NextConfig } from "next";

/** Native/Node-only packages that must not be bundled by webpack. */
const DB_EXTERNALS =
  /^(@libsql\/|libsql|better-sqlite3|drizzle-orm\/libsql|drizzle-orm\/better-sqlite3)/;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@uberskills/ui",
    "@uberskills/db",
    "@uberskills/skill-engine",
    "@uberskills/types",
  ],
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/hrana-client",
    "better-sqlite3",
    "libsql",
    "archiver",
    "pino",
    "pino-pretty",
  ],
  // biome-ignore lint/suspicious/noExplicitAny: webpack config types not available
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      // Custom externals function to ensure native database packages are not bundled.
      const prev = config.externals;
      config.externals = [
        ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
        // biome-ignore lint/suspicious/noExplicitAny: webpack externals callback API
        (ctx: any, cb: any) => {
          if (ctx.request && DB_EXTERNALS.test(ctx.request)) {
            return cb(null, `commonjs ${ctx.request}`);
          }
          cb();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
