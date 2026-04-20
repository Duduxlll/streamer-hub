import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const twitchLogin = (req.auth?.user as { twitchLogin?: string })?.twitchLogin;

  // Protege rotas /admin — exige login e permissão de admin
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdmin(twitchLogin)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Redireciona admins de /arena/* para /admin/* (sem flash, sem clique duplo)
  if (pathname.startsWith("/arena/") && req.auth && isAdmin(twitchLogin)) {
    return NextResponse.redirect(
      new URL(pathname.replace("/arena/", "/admin/"), req.url)
    );
  }
});

export const config = {
  matcher: ["/admin/:path*", "/arena/:path+"],
};
