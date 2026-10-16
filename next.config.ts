import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  devIndicators: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chat.z.ai"],
};

export default nextConfig;
