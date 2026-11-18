import type { NextConfig } from "next";
const config: NextConfig = {output:"export", reactStrictMode:false, transpilePackages:["@open-reading-layers/core"], images:{unoptimized:true}};
export default config;

