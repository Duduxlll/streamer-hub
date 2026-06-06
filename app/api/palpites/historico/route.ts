import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isVerifiedAdminSession } from "@/lib/admin-identity";
import { getHistorico, clearHistorico } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET() {
  return NextResponse.json(await getHistorico(), { headers: NO_STORE_HEADERS });
}

export async function DELETE() {
  const session = await auth();
  if (!(await isVerifiedAdminSession(session))) {
    return NextResponse.json({ error: "Proibido" }, { status: 403 });
  }
  await clearHistorico();
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
