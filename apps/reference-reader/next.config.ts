import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Thorium 1.6 keeps a singleton navigator and destroys it asynchronously.
  // React's development effect replay can destroy the replacement instance.
  reactStrictMode: false,
  transpilePackages: ["@open-reading-layers/core"],
  turbopack: { root: path.resolve(__dirname, "../..") }
};

export default nextConfig;
