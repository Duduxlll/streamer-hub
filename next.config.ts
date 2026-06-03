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
      "img-src 'self' data: https://static-cdn.jtvnw.net https://cdn.twitch.tv",
      "connect-src 'self' https://id.twitch.tv https://api.twitch.tv",
      "frame-src 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

// Cross-Origin Isolation — exigido pelo jogo Godot (WebAssembly) na corrida 3D.
// COEP "credentialless" mantém o isolamento sem bloquear imagens públicas (ex.: avatares da Twitch).
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
      // A corrida 3D (página + arquivos do jogo) precisa de cross-origin isolation
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
