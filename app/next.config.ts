import path from "node:path";
import type { NextConfig } from "next";

/**
 * Shared ConnEthics packages are vendored in `vendor/@connethics/*` (see docs/SHARED_PACKAGES.md):
 * the app is deployed on its own (Vercel Root Directory = `app`), outside the npm workspace.
 * `tsconfig.json` maps the package names for TypeScript; the aliases below do the same for the
 * bundler (Turbopack for `next dev`/`next build`, webpack if `--webpack` is used), including the
 * `@connethics/arazzo-core` import made by the vendored `arazzo-flow` bundle.
 */
const sharedAliases = {
  "@connethics/arazzo-core": "./vendor/@connethics/arazzo-core/dist/index.js",
  "@connethics/arazzo-flow/style.css": "./vendor/@connethics/arazzo-flow/dist/style.css",
  "@connethics/arazzo-flow": "./vendor/@connethics/arazzo-flow/dist/index.js",
};

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: sharedAliases,
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...Object.fromEntries(
        Object.entries(sharedAliases).map(([name, target]) => [`${name}$`, path.resolve(__dirname, target)]),
      ),
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/playground',
        destination: '/builder',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
