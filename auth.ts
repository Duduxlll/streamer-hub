import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import { applyAuthUrlFallback } from "@/lib/site-url";

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
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.twitchLogin = (profile as Record<string, unknown>).preferred_username as string;
        token.twitchId = (profile as Record<string, unknown>).sub as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.twitchId as string ?? token.sub ?? "";
      session.user.twitchLogin = token.twitchLogin as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
