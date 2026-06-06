
const FALLBACK_ADMINS = ["dudufpss", "dudufpsssss", "stainzincs"];

export function getAdminLogins(): string[] {
  const raw = process.env.ADMIN_LOGINS ?? process.env.NEXT_PUBLIC_ADMIN_LOGINS ?? "";
  const fromEnv = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return fromEnv.length ? fromEnv : FALLBACK_ADMINS;
}

export function isAdmin(twitchLogin?: string | null): boolean {
  if (!twitchLogin) return false;
  return getAdminLogins().includes(twitchLogin.toLowerCase());
}
