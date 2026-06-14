import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Removed Webpack React path alias as it breaks Next.js App Router server/client runtime boundary
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
