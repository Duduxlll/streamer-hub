const LOCAL_SITE_URL = "http://localhost:3000";
const STALE_SITE_HOSTS = new Set(["streamer-hub-delta.vercel.app"]);

function normalizeSiteUrl(value?: string | null) {
  if (!value) return "";

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function isLocalUrl(value: string) {
  return /\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}

function isStaleUrl(value: string) {
  try {
    return STALE_SITE_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function getSiteUrl() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const candidates = isProduction
    ? [
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL,
        process.env.SITE_URL,
        process.env.NEXTAUTH_URL,
        process.env.AUTH_URL,
      ]
    : [
        process.env.SITE_URL,
        process.env.NEXTAUTH_URL,
        process.env.AUTH_URL,
        LOCAL_SITE_URL,
      ];

  for (const candidate of candidates) {
    const url = normalizeSiteUrl(candidate);
    if (!url) continue;
    if (isProduction && isLocalUrl(url)) continue;
    if (isProduction && isStaleUrl(url)) continue;
    return url;
  }

  return LOCAL_SITE_URL;
}

export function applyAuthUrlFallback() {
  const siteUrl = getSiteUrl();

  const authUrl = normalizeSiteUrl(process.env.AUTH_URL);
  if (!authUrl || isLocalUrl(authUrl) || isStaleUrl(authUrl)) {
    process.env.AUTH_URL = siteUrl;
  }

  const nextAuthUrl = normalizeSiteUrl(process.env.NEXTAUTH_URL);
  if (!nextAuthUrl || isLocalUrl(nextAuthUrl) || isStaleUrl(nextAuthUrl)) {
    process.env.NEXTAUTH_URL = siteUrl;
  }
}
