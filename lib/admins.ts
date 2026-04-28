export const ADMINS: string[] = [
  "dudufpss",
  "dudufpsssss",
  "stainzincs",
];

export function isAdmin(twitchLogin?: string | null): boolean {
  if (!twitchLogin) return false;
  return ADMINS.includes(twitchLogin.toLowerCase());
}
