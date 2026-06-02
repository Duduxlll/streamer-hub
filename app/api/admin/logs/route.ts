import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getLogs, addLog } from "@/lib/security-log";

export const dynamic = "force-dynamic";
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const logs = await getLogs();
  return NextResponse.json({ logs }, { headers: NO_CACHE });
}

export async function POST() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  await addLog({
    admin:  session!.user!.twitchLogin!,
    action: "admin_login",
    detail: "Evento de teste — log de segurança funcionando ✓",
  });
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}
