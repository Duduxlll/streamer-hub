import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isVerifiedAdminSession } from "@/lib/admin-identity";
import {
  getUsers, banUser, desbanirUser, suspenderUser, dessuspenderUser, setPassword, removerContasSemSenha, excluirUser,
} from "@/lib/users-store";
import { addLog } from "@/lib/security-log";
import { getHistoricoGorjeta, excluirCadastroUsuario } from "@/lib/gorjeta-store";
import { clearResetCode } from "@/lib/password-reset";

export const dynamic = "force-dynamic";
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

async function requireAdmin() {
  const session = await auth();
  if (!(await isVerifiedAdminSession(session))) return null;
  return session!.user!.twitchLogin!;
}

export async function GET(req: NextRequest) {
  const adminLogin = await requireAdmin();
  if (!adminLogin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const url    = new URL(req.url);
  const target = url.searchParams.get("history");

  if (target) {
    const historico = await getHistoricoGorjeta();
    const ganhos = historico.flatMap(h =>
      h.transacoes
        .filter(t => t.username.toLowerCase() === target.toLowerCase() && t.status === "enviado")
        .map(t => ({ sessaoId: h.id, abertaEm: h.abertaEm, valor: t.valor, tipo: t.tipo }))
    );
    return NextResponse.json({ ganhos }, { headers: NO_CACHE });
  }

  const users = (await getUsers()).map(({ passwordHash, ...u }) => { void passwordHash; return u; });
  return NextResponse.json({ users }, { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const adminLogin = await requireAdmin();
  if (!adminLogin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const { action, twitchLogin, motivo, suspAte, novaSenha } = body as {
    action: string; twitchLogin: string; motivo?: string; suspAte?: number; novaSenha?: string;
  };

  if (action === "limpar-antigos") {
    const removidos = await removerContasSemSenha();
    await addLog({ admin: adminLogin, action: "limpar_antigos", target: "—", detail: `${removidos} conta(s) antiga(s) removida(s)` });
    return NextResponse.json({ ok: true, removidos }, { headers: NO_CACHE });
  }

  if (!twitchLogin) return NextResponse.json({ error: "twitchLogin obrigatório" }, { status: 400 });

  if (action === "reset-senha") {
    if (!novaSenha || novaSenha.length < 6) return NextResponse.json({ error: "Senha precisa ter no mínimo 6 caracteres" }, { status: 400 });
    const ok = await setPassword(twitchLogin, novaSenha);
    if (ok) await addLog({ admin: adminLogin, action: "reset_senha", target: twitchLogin, detail: "Senha redefinida pelo admin" });
    return NextResponse.json({ ok }, { headers: NO_CACHE });
  }

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

  if (action === "excluir") {
    if (twitchLogin.toLowerCase() === adminLogin.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "Você não pode excluir a sua própria conta." }, { status: 400 });
    }
    const removido = await excluirUser(twitchLogin);
    if (!removido) return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404, headers: NO_CACHE });
    await excluirCadastroUsuario(twitchLogin);
    if (removido.email) await clearResetCode(removido.email);
    await addLog({ admin: adminLogin, action: "excluir_conta", target: twitchLogin, detail: "Conta excluída permanentemente (dados + print + cadastro de gorjeta)" });
    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
