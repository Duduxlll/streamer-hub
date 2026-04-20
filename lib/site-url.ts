const FALLBACK_SITE_URL = "https://streamer-hub-delta.vercel.app";

function normalizeSiteUrl(value?: string | null) {
  if (!value) return "";

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function isLocalUrl(value: string) {
  return /\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}

export function getSiteUrl() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const candidates = [
    process.env.SITE_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    FALLBACK_SITE_URL,
  ];

  for (const candidate of candidates) {
    const url = normalizeSiteUrl(candidate);
    if (!url) continue;
    if (isProduction && isLocalUrl(url)) continue;
    return url;
  }

  return FALLBACK_SITE_URL;
}

export function applyAuthUrlFallback() {
  const siteUrl = getSiteUrl();

  if (!process.env.AUTH_URL || isLocalUrl(normalizeSiteUrl(process.env.AUTH_URL))) {
    process.env.AUTH_URL = siteUrl;
  }

  if (!process.env.NEXTAUTH_URL || isLocalUrl(normalizeSiteUrl(process.env.NEXTAUTH_URL))) {
    process.env.NEXTAUTH_URL = siteUrl;
  }
}
