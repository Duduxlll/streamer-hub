import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import {
  getUsers, banUser, desbanirUser, suspenderUser, dessuspenderUser,
} from "@/lib/users-store";
import { addLog } from "@/lib/security-log";
import { getHistoricoGorjeta } from "@/lib/gorjeta-store";

export const dynamic = "force-dynamic";
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

async function requireAdmin() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) return null;
  return session!.user!.twitchLogin!;
}

export async function GET(req: NextRequest) {
  const adminLogin = await requireAdmin();
  if (!adminLogin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const url    = new URL(req.url);
  const target = url.searchParams.get("history"); // ?history=twitchLogin

  if (target) {
    // Histórico de gorjetas ganhas pelo usuário
    const historico = await getHistoricoGorjeta();
    const ganhos = historico.flatMap(h =>
      h.transacoes
        .filter(t => t.username.toLowerCase() === target.toLowerCase() && t.status === "enviado")
        .map(t => ({ sessaoId: h.id, abertaEm: h.abertaEm, valor: t.valor, tipo: t.tipo }))
    );
    return NextResponse.json({ ganhos }, { headers: NO_CACHE });
  }

  const users = await getUsers();
  return NextResponse.json({ users }, { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const adminLogin = await requireAdmin();
  if (!adminLogin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const { action, twitchLogin, motivo, suspAte } = body as {
    action: string; twitchLogin: string; motivo?: string; suspAte?: number;
  };

  if (!twitchLogin) return NextResponse.json({ error: "twitchLogin obrigatório" }, { status: 400 });

  if (action === "ban") {
    const ok = await banUser(twitchLogin, motivo ?? "Banido pelo admin", adminLogin);
    if (ok) await addLog({ admin: adminLogin, action: "ban", target: twitchLogin, detail: motivo });
    return NextResponse.json({ ok }, { headers: NO_CACHE });
  }

  if (action === "unban") {
    const ok = await desbanirUser(twitchLogin);
    if (ok) await addLog({ admin: adminLogin, action: "unban", target: twitchLogin });
    return NextResponse.json({ ok }, { headers: NO_CACHE });
  }

  if (action === "suspend") {
    if (!suspAte || typeof suspAte !== "number") return NextResponse.json({ error: "suspAte obrigatório" }, { status: 400 });
    const ok = await suspenderUser(twitchLogin, suspAte, motivo ?? "Suspenso pelo admin", adminLogin);
    if (ok) await addLog({ admin: adminLogin, action: "suspend", target: twitchLogin, detail: `Até ${new Date(suspAte).toLocaleString("pt-BR")} — ${motivo ?? ""}` });
    return NextResponse.json({ ok }, { headers: NO_CACHE });
  }

  if (action === "unsuspend") {
    const ok = await dessuspenderUser(twitchLogin);
    if (ok) await addLog({ admin: adminLogin, action: "unsuspend", target: twitchLogin });
    return NextResponse.json({ ok }, { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
