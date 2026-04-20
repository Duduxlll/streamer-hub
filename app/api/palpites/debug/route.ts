import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getStoreDiagnostics } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await auth();
  if (!session || !isAdmin(session.user?.twitchLogin)) {
    return NextResponse.json({ error: "Proibido" }, { status: 403 });
  }

  return NextResponse.json(await getStoreDiagnostics(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
