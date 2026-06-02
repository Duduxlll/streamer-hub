import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import { applyAuthUrlFallback } from "@/lib/site-url";
import { isAdmin } from "@/lib/admins";
import { upsertUser, isBanned } from "@/lib/users-store";
import { addLog } from "@/lib/security-log";

applyAuthUrlFallback();

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      twitchLogin?: string;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid user:read:email",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user, profile }) {
      try {
        const twitchLogin = ((profile as Record<string, unknown>)?.preferred_username as string ?? "").toLowerCase();
        if (!twitchLogin) return true;

        // Bloqueia login de usuários banidos/suspensos
        const banned = await isBanned(twitchLogin);
        if (banned) {
          await addLog({ admin: "sistema", action: "acesso_negado", target: twitchLogin, detail: "Login bloqueado — conta banida ou suspensa" });
          return false;
        }

        // Rastreia o login
        await upsertUser({
          twitchId:    (profile as Record<string, unknown>)?.sub as string ?? user.id ?? "",
          twitchLogin,
          displayName: user.name ?? twitchLogin,
          image:       user.image ?? null,
        });

        // Log de login admin
        if (isAdmin(twitchLogin)) {
          await addLog({ admin: twitchLogin, action: "admin_login", detail: "Login no painel admin" });
        }
      } catch { /* best-effort — não bloqueia o login em caso de erro de DB */ }
      return true;
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.twitchLogin = (profile as Record<string, unknown>).preferred_username as string;
        token.twitchId    = (profile as Record<string, unknown>).sub as string;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id          = token.twitchId as string ?? token.sub ?? "";
      session.user.twitchLogin = token.twitchLogin as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },
});
