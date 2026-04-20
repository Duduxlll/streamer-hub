import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const twitchLogin = (req.auth?.user as { twitchLogin?: string })?.twitchLogin;

    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdmin(twitchLogin)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
