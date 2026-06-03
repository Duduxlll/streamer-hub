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
        email:    { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(creds) {
        const email    = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // Valida e-mail + senha
        const user = await verifyCredentials(email, password);
        if (!user) return null;

        const login = user.twitchLogin;

        // Bloqueia banidos/suspensos
        if (await isBanned(login)) {
          await addLog({ admin: "sistema", action: "acesso_negado", target: login, detail: "Login bloqueado — conta banida ou suspensa" });
          return null;
        }

        await touchLogin(login);
        if (isAdmin(login)) {
          await addLog({ admin: login, action: "admin_login", detail: "Login no painel admin" });
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
