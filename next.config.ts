import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build auto-contido para self-hosting (Hostinger VPS / Node.js).
  // Gera .next/standalone com um server.js pronto para `node server.js`.
  output: "standalone",
};

export default nextConfig;
