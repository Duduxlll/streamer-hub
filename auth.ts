import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { applyAuthUrlFallback } from "@/lib/site-url";
import { isAdmin } from "@/lib/admins";
import { verifyCredentials, touchLogin, isBanned } from "@/lib/users-store";
import { addLog } from "@/lib/security-log";

applyAuthUrlFallback();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Nome da Twitch", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(creds) {
        const username = String(creds?.username ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!username || !password) return null;

        // Valida usuário + senha
        const user = await verifyCredentials(username, password);
        if (!user) return null;

        // Bloqueia banidos/suspensos
        if (await isBanned(username)) {
          await addLog({ admin: "sistema", action: "acesso_negado", target: username, detail: "Login bloqueado — conta banida ou suspensa" });
          return null;
        }

        await touchLogin(username);
        if (isAdmin(username)) {
          await addLog({ admin: username, action: "admin_login", detail: "Login no painel admin" });
        }

        return {
          id:          user.twitchId,
          name:        user.displayName,
          email:       user.email ?? null,
          image:       user.image ?? null,
          twitchLogin: user.twitchLogin,
        };
      },
    }),
  ],
});
