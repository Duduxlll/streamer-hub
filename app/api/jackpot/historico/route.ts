import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isVerifiedAdminSession } from "@/lib/admin-identity";
import { getHistoricoJackpot, limparHistoricoJackpot } from "@/lib/jackpotStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const historico = await getHistoricoJackpot();
  return NextResponse.json(historico);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!(await isVerifiedAdminSession(session))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  await limparHistoricoJackpot();
  return NextResponse.json({ ok: true });
}
