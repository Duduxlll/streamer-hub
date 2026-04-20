import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getHistorico, clearHistorico } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getHistorico());
}

export async function DELETE() {
  const session = await auth();
  if (!session || !isAdmin(session.user?.twitchLogin)) {
    return NextResponse.json({ error: "Proibido" }, { status: 403 });
  }
  clearHistorico();
  return NextResponse.json({ ok: true });
}
