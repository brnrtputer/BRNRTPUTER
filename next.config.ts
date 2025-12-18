import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  webpack: (config) => {
    // Ignore test, bench, and example files from node_modules
    config.module.rules.push({
      test: /node_modules.*\/(test|bench|example).*\.(js|mjs|ts)$/,
      loader: 'ignore-loader',
    });
    
    return config;
  },
};

export default nextConfig;
