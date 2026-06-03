import type { NextAuthConfig } from "next-auth";

// Configuração "leve" (edge-safe) compartilhada entre o proxy/middleware e o auth completo.
// NÃO importa node:crypto nem o provider de Credentials — só lê/escreve o token JWT.
// O provider real (Credentials, que valida a senha) é adicionado em auth.ts (runtime Node).

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
  interface User {
    twitchLogin?: string;
  }
}

export const authConfig = {
  trustHost: true,
  providers: [], // preenchido em auth.ts

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      // No login com Credentials, `user` vem do authorize() na primeira passagem.
      if (user) {
        token.twitchLogin = (user as { twitchLogin?: string }).twitchLogin;
        token.twitchId    = user.id ?? undefined;
        if (user.name) token.name = user.name;
        token.picture = user.image ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id          = (token.twitchId as string) ?? token.sub ?? "";
      session.user.twitchLogin = token.twitchLogin as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
