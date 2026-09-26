import type { NextConfig } from "next";

const securityHeaders = [
  // Anti-clickjacking moderne : CSP frame-ancestors (supersède X-Frame-Options
  // dans les navigateurs récents) — on autorise l'embedding par la plateforme
  // elle-même (preview panel, éditeur) au lieu de tout bloquer (DENY).
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'self' https://*.space-z.ai https://*.z.ai https://*.chatglm.cn",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
