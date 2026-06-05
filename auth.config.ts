import type { NextAuthConfig } from "next-auth";


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
  providers: [],

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
