import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: path.resolve(process.cwd(), 'node_modules', 'react'),
      'react-dom': path.resolve(process.cwd(), 'node_modules', 'react-dom'),
    };
    return config;
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
