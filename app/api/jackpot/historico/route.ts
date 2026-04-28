import { NextResponse } from "next/server";
import { getHistoricoJackpot } from "@/lib/jackpotStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const historico = await getHistoricoJackpot();
  return NextResponse.json(historico);
}
