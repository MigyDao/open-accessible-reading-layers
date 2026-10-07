import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@open-reading-layers/core"],
  turbopack: { root: path.resolve(__dirname, "../..") }
};

export default nextConfig;
