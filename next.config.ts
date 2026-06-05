import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://static-cdn.jtvnw.net https://cdn.twitch.tv",
      "connect-src 'self' blob: https://id.twitch.tv https://api.twitch.tv",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "media-src 'self' blob: data:",
      "frame-src 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const crossOriginIsolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/admin/corrida",
        headers: crossOriginIsolation,
      },
      {
        source: "/marble-web/:path*",
        headers: crossOriginIsolation,
      },
    ];
  },
};

export default nextConfig;
