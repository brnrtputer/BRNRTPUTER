import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'why-is-node-running': false,
      'tape': false,
    };
    return config;
  },
};

export default nextConfig;
