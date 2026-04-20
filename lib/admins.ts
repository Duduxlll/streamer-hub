export const ADMINS: string[] = [
  "dudufpss",
];

export function isAdmin(twitchLogin?: string | null): boolean {
  if (!twitchLogin) return false;
  return ADMINS.includes(twitchLogin.toLowerCase());
}
