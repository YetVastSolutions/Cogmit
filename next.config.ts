import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure blocking metadata in <head> for all user agents and social crawlers (e.g. WhatsApp, iMessage, etc.)
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["isomorphic-dompurify"],
};

export default nextConfig;
