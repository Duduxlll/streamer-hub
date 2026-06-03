// Os administradores são definidos pelo NICK da Twitch, via variável de ambiente
// NEXT_PUBLIC_ADMIN_LOGINS (lista separada por vírgula). Ex.:
//   NEXT_PUBLIC_ADMIN_LOGINS=dudufpss,stainzincs
// Quem criar a conta com um desses nicks vira admin automaticamente.
// (É NEXT_PUBLIC para funcionar também no navegador; o nick não é segredo — o que
//  protege o acesso é a senha + o login por e-mail.)

const FALLBACK_ADMINS = ["dudufpss", "dudufpsssss", "stainzincs"];

export function getAdminLogins(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_LOGINS ?? "";
  const fromEnv = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return fromEnv.length ? fromEnv : FALLBACK_ADMINS;
}

export function isAdmin(twitchLogin?: string | null): boolean {
  if (!twitchLogin) return false;
  return getAdminLogins().includes(twitchLogin.toLowerCase());
}
