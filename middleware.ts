import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ADMINS } from "@/lib/admins";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const twitchLogin = (token?.twitchLogin as string | undefined)?.toLowerCase();
  const admin = !!(twitchLogin && ADMINS.includes(twitchLogin));

  // Redireciona admins de /arena/* para /admin/* (server-side, sem flash)
  if (admin && pathname.startsWith("/arena/")) {
    return NextResponse.redirect(
      new URL(pathname.replace("/arena/", "/admin/"), req.nextUrl)
    );
  }
}

export const config = {
  matcher: ["/arena/:path+"],
};
