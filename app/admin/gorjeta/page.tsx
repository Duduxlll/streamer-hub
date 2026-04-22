"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { CadastroGorjeta, SessaoGorjeta } from "@/lib/gorjeta-store";

function mascarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

function formatCpfInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function Avatar({ image, name, size = 32 }: { image: string | null; name: string; size?: number }) {
  if (image) return (
    <img src={image} alt={name}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size, border: "2px solid rgba(255,186,0,0.3)" }} />
  );
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#ffba00]"
      style={{ width: size, height: size, fontSize: size * 0.35, background: "rgba(255,186,0,0.12)", border: "2px solid rgba(255,186,0,0.25)" }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status: "pendente" | "aprovado" | "rejeitado" }) {
  const map = {
    pendente:  { label: "Pendente",  color: "#ffba00", bg: "rgba(255,186,0,0.12)",  border: "rgba(255,186,0,0.3)"  },
    aprovado:  { label: "Aprovado",  color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.3)" },
    rejeitado: { label: "Rejeitado", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function PayBadge({ status, erro }: { status: string; erro?: string }) {
  if (status === "enviado") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
      ✓ PIX enviado
    </span>
  );
  if (status === "falhou") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
      title={erro}
      style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
      ✕ Falhou
    </span>
  );
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ color: "#6b7280", background: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)" }}>
      Não cadastrado
    </span>
  );
}

function ScreenshotModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/gorjeta?screenshot=${id}`)
      .then(r => r.json()).then(d => setSrc(d.screenshot ?? null)).catch(() => setSrc(null));
  }, [id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="relative max-w-lg w-full rounded-3xl overflow-hidden"
        style={{ background: "rgba(6,4,18,0.98)", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 0 60px rgba(255,186,0,0.08)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <span className="text-sm font-black text-white">Comprovante de depósito</span>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors hover:bg-white/5">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          {src
            ? <img src={src} alt="comprovante" className="w-full rounded-2xl object-contain max-h-[70vh]" />
            : <div className="h-40 flex items-center justify-center text-gray-600 text-sm">Carregando...</div>
          }
        </div>
      </div>
    </div>
  );
}

function CadastroCard({ c, onAprovar, onRejeitar, onVerFoto, onCpfEditado }: {
  c: CadastroGorjeta;
  onAprovar: () => void;
  onRejeitar: (motivo: string) => void;
  onVerFoto: () => void;
  onCpfEditado: (novoCpf: string) => void;
}) {
  const [rejMotivo, setRejMotivo] = useState("");
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [showEditCpf, setShowEditCpf] = useState(false);
  const [cpfEdit, setCpfEdit] = useState("");
  const [busy, setBusy] = useState(false);
  const [editErr, setEditErr] = useState("");

  const borderColor = c.status === "aprovado" ? "rgba(74,222,128,0.2)" : c.status === "rejeitado" ? "rgba(248,113,113,0.15)" : "rgba(255,186,0,0.15)";
  const glowColor   = c.status === "aprovado" ? "rgba(74,222,128,0.03)" : c.status === "rejeitado" ? "rgba(248,113,113,0.03)" : "rgba(255,186,0,0.04)";

  async function salvarCpf() {
    const d = cpfEdit.replace(/\D/g, "");
    if (d.length !== 11) { setEditErr("CPF inválido (11 dígitos)"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/gorjeta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editar-cpf", id: c.id, cpf: d }),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error ?? "Erro"); return; }
      onCpfEditado(d);
      setShowEditCpf(false);
    } catch { setEditErr("Erro de conexão"); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: `rgba(6,4,18,0.9)`, border: `1px solid ${borderColor}`, boxShadow: `0 4px 24px ${glowColor}` }}>

      {/* Header do card */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-black text-white">{c.displayName}</span>
              <span className="text-[11px] text-gray-600">@{c.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={c.status} />
              <span className="text-[10px] text-gray-600">{new Date(c.criadoEm).toLocaleString("pt-BR")}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onVerFoto}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-black text-gray-400 transition-all hover:text-white hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            📎 Foto
          </button>
          <button onClick={() => { setCpfEdit(formatCpfInput(c.cpf)); setEditErr(""); setShowEditCpf(s => !s); setShowRejeitar(false); }}
            title="Editar CPF/PIX"
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: showEditCpf ? "#ffba00" : "#6b7280" }}>
            ✏️
          </button>
        </div>
      </div>

      {/* Dados */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
        <div>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Nome completo</p>
          <p className="text-xs font-bold text-white truncate">{c.nomeCompleto}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">PIX (CPF)</p>
          <p className="text-xs font-bold text-white">{mascarCpf(c.cpf)}</p>
        </div>
      </div>
      {c.motivoRejeicao && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-xl text-xs text-red-400"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
          Motivo: {c.motivoRejeicao}
        </div>
      )}

      {/* Ações */}
      <div className="px-5 pb-4 flex gap-2 border-t border-white/5 pt-3">
        {c.status !== "aprovado" && (
          <button disabled={busy}
            onClick={async () => { setBusy(true); await Promise.resolve(); onAprovar(); setBusy(false); }}
            className="flex-1 py-2 rounded-xl text-xs font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.15))", border: "1px solid rgba(74,222,128,0.3)" }}>
            ✓ Aprovar
          </button>
        )}
        {c.status !== "rejeitado" && (
          <button onClick={() => { setShowRejeitar(s => !s); setShowEditCpf(false); }}
            className="flex-1 py-2 rounded-xl text-xs font-black transition-all hover:scale-[1.02]"
            style={{ color: showRejeitar ? "#f87171" : "#6b7280", background: showRejeitar ? "rgba(248,113,113,0.1)" : "transparent", border: "1px solid rgba(248,113,113,0.2)" }}>
            ✕ Rejeitar
          </button>
        )}
        {c.status === "aprovado" && (
          <button onClick={() => { setShowRejeitar(s => !s); setShowEditCpf(false); }}
            className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
            style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.06)" }}>
            Revogar aprovação
          </button>
        )}
      </div>

      {/* Editar CPF */}
      {showEditCpf && (
        <div className="px-5 pb-4 space-y-2 border-t border-[#ffba00]/10 pt-3"
          style={{ background: "rgba(255,186,0,0.025)" }}>
          <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest">Editar PIX / CPF</p>
          <div className="flex gap-2">
            <input type="text" inputMode="numeric" placeholder="000.000.000-00"
              value={cpfEdit}
              onChange={e => { setCpfEdit(formatCpfInput(e.target.value)); setEditErr(""); }}
              className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-gray-600 outline-none"
              style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.3)" }} />
            <button disabled={busy} onClick={salvarCpf}
              className="px-4 py-2 rounded-xl text-xs font-black text-black disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
              {busy ? "..." : "Salvar"}
            </button>
            <button onClick={() => { setShowEditCpf(false); setEditErr(""); }}
              className="px-3 py-2 rounded-xl text-xs font-black text-gray-500 hover:text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              ✕
            </button>
          </div>
          {editErr && <p className="text-xs text-red-400 font-bold">{editErr}</p>}
        </div>
      )}

      {/* Rejeitar */}
      {showRejeitar && (
        <div className="px-5 pb-4 flex gap-2 border-t border-red-500/10 pt-3"
          style={{ background: "rgba(248,113,113,0.025)" }}>
          <input type="text" placeholder="Motivo da rejeição (opcional)"
            value={rejMotivo} onChange={e => setRejMotivo(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-gray-600 outline-none"
            style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }} />
          <button disabled={busy}
            onClick={async () => { setBusy(true); await Promise.resolve(); onRejeitar(rejMotivo); setBusy(false); setShowRejeitar(false); }}
            className="px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, rgba(248,113,113,0.4), rgba(239,68,68,0.3))", border: "1px solid rgba(248,113,113,0.3)" }}>
            {busy ? "..." : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminGorjetaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"cadastros" | "sessao" | "historico">("sessao");
  const [cadastroFiltro, setCadastroFiltro] = useState<"pendente" | "aprovado" | "rejeitado">("pendente");
  const [cadastros, setCadastros] = useState<CadastroGorjeta[]>([]);
  const [sessao, setSessao] = useState<SessaoGorjeta | null>(null);
  const [historico, setHistorico] = useState<Array<{
    id: string; valorUnitario: number; totalEnviado: number;
    pagamentos: Array<{ username: string; displayName: string; cpf: string; nomeCompleto: string; status: string; erro?: string }>;
    abertaEm: number; fechadaEm: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [formSessao, setFormSessao] = useState({ valorUnitario: "10", maxVencedores: "3" });
  const [screenshotModalId, setScreenshotModalId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  const fetchAll = useCallback(async () => {
    const [gRes, cRes] = await Promise.all([fetch("/api/gorjeta"), fetch("/api/gorjeta?tipo=cadastros")]);
    const gData = await gRes.json();
    const cData = await cRes.json();
    setSessao(gData.sessao ?? null);
    setHistorico(gData.historico ?? []);
    setCadastros(cData.cadastros ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchAll();
    const iv = setInterval(fetchAll, 4000);
    return () => clearInterval(iv);
  }, [status, fetchAll]);

  function flash(text: string, type: "ok" | "err") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function apiCall(body: object) {
    setBusy(true);
    try {
      const res = await fetch("/api/gorjeta", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error ?? "Erro", "err"); return null; }
      await fetchAll();
      return data;
    } catch { flash("Erro de conexão", "err"); return null; }
    finally { setBusy(false); }
  }

  function atualizarCpfLocal(id: string, novoCpf: string) {
    setCadastros(prev => prev.map(c => c.id === id ? { ...c, cpf: novoCpf } : c));
    flash("CPF atualizado!", "ok");
  }

  async function aprovar(id: string) { const r = await apiCall({ action: "aprovar", id }); if (r) flash("Aprovado!", "ok"); }
  async function rejeitar(id: string, motivo: string) { const r = await apiCall({ action: "rejeitar", id, motivo }); if (r) flash("Rejeitado", "ok"); }
  async function abrirSessao() { const r = await apiCall({ action: "abrir-sessao", valorUnitario: Number(formSessao.valorUnitario.replace(",", ".")), maxVencedores: Number(formSessao.maxVencedores) }); if (r) flash("Sessão aberta!", "ok"); }
  async function sortear() { const r = await apiCall({ action: "sortear" }); if (r) flash("Sorteado!", "ok"); }
  async function pagar() { const r = await apiCall({ action: "pagar" }); if (r) flash(`PIX enviados! Sucesso: ${r.pagamentos?.filter((p: { status: string }) => p.status === "enviado").length ?? 0}`, "ok"); }
  async function fecharSessao() { const r = await apiCall({ action: "fechar-sessao" }); if (r) flash("Encerrada", "ok"); }
  async function limparSessao() { const r = await apiCall({ action: "limpar-sessao" }); if (r) flash("Removida", "ok"); }

  if (loading || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid rgba(255,186,0,0.15)", borderTopColor: "#ffba00" }} />
      </div>
    );
  }

  const pendentes  = cadastros.filter(c => c.status === "pendente");
  const aprovados  = cadastros.filter(c => c.status === "aprovado");
  const rejeitados = cadastros.filter(c => c.status === "rejeitado");

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      {/* Glow de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(ellipse, #ffba00, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {screenshotModalId && <ScreenshotModal id={screenshotModalId} onClose={() => setScreenshotModalId(null)} />}

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-700 mb-8">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span className="text-gray-800">/</span>
          <span className="text-gray-500">Admin · Gorjeta</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Gorjeta</h1>
            <p className="text-sm text-gray-600 mt-0.5">Painel de administração</p>
          </div>
          {msg && (
            <div className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${msg.type === "ok"
              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25"
              : "text-red-400 bg-red-500/10 border border-red-500/25"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Tabs principais */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {(["sessao", "cadastros", "historico"] as const).map(t => {
            const labels = { sessao: "Sessão", cadastros: "Cadastros", historico: "Histórico" };
            const dot = t === "cadastros" && pendentes.length > 0;
            return (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all relative"
                style={tab === t
                  ? { background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 0 20px rgba(255,186,0,0.06)" }
                  : { color: "#4b5563" }}>
                {labels[t]}
                {dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ffba00]"
                    style={{ boxShadow: "0 0 6px #ffba00" }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── ABA SESSÃO ── */}
        {tab === "sessao" && (
          <div className="space-y-4">
            {!sessao || sessao.status === "fechada" ? (
              /* Formulário abrir sessão */
              <div className="rounded-3xl overflow-hidden"
                style={{ background: "rgba(6,4,18,0.9)", border: "1px solid rgba(255,186,0,0.15)", boxShadow: "0 0 40px rgba(255,186,0,0.04)" }}>
                <div className="px-6 py-5 border-b border-white/5">
                  <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest mb-1">Nova sessão</p>
                  <h2 className="text-lg font-black text-white">Abrir gorjeta</h2>
                </div>
                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2">Valor por vencedor (R$)</label>
                      <input type="text" value={formSessao.valorUnitario}
                        onChange={e => setFormSessao(f => ({ ...f, valorUnitario: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white placeholder-gray-700 outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2">Qtd. vencedores</label>
                      <input type="number" min="1" max="20" value={formSessao.maxVencedores}
                        onChange={e => setFormSessao(f => ({ ...f, maxVencedores: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white placeholder-gray-700 outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.12)" }}>
                    <span className="text-xs text-gray-500">Total máximo</span>
                    <span className="text-sm font-black" style={{ background: "linear-gradient(135deg, #ffba00, #ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      R$ {(Number(formSessao.valorUnitario.replace(",", ".")) * Number(formSessao.maxVencedores) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button onClick={abrirSessao} disabled={busy}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.25)" }}>
                    {busy ? "Abrindo..." : "💰 Abrir gorjeta"}
                  </button>
                </div>
              </div>
            ) : (
              /* Sessão ativa */
              <div className="space-y-4">
                {/* Status header */}
                <div className="rounded-3xl overflow-hidden"
                  style={{ background: "rgba(6,4,18,0.95)", border: "1px solid rgba(255,186,0,0.25)", boxShadow: "0 0 50px rgba(255,186,0,0.06)" }}>

                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      {sessao.status === "aberta" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffba00] opacity-75" />}
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffba00]" />
                    </span>
                    <span className="text-sm font-black text-white flex-1">
                      {sessao.status === "aberta" ? "Sessão ao vivo" : "Aguardando pagamento"}
                    </span>
                    {sessao.status === "aberta" && (
                      <span className="text-[11px] font-black px-3 py-1 rounded-full text-black"
                        style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>LIVE</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 divide-x divide-white/5">
                    {[
                      { label: "Participantes", val: sessao.participantes.length, gold: false },
                      { label: "Vencedores", val: sessao.maxVencedores, gold: false },
                      { label: "Total R$", val: `${(sessao.valorUnitario * sessao.maxVencedores).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, gold: true },
                    ].map(s => (
                      <div key={s.label} className="py-5 text-center">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">{s.label}</p>
                        <p className="text-2xl font-black" style={s.gold ? {
                          background: "linear-gradient(135deg, #ffba00, #ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        } : { color: "#fff" }}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Participantes */}
                {sessao.participantes.length > 0 && (
                  <div className="rounded-3xl overflow-hidden"
                    style={{ background: "rgba(6,4,18,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex-1">Participantes</p>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
                        style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)" }}>
                        {sessao.participantes.length}
                      </span>
                    </div>
                    <div className="p-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                      <div className="flex gap-2.5" style={{ width: "max-content" }}>
                        {sessao.participantes.map(p => (
                          <div key={p.username} className="relative overflow-hidden rounded-2xl flex flex-col items-center flex-shrink-0"
                            style={{ width: 88, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {p.image && (
                              <img src={p.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                style={{ filter: "blur(10px) brightness(0.18)", transform: "scale(1.3)" }} />
                            )}
                            <div className="relative z-10 flex flex-col items-center gap-1.5 px-2 pt-3 pb-2.5 w-full">
                              <Avatar image={p.image} name={p.displayName} size={40} />
                              <p className="text-[10px] font-black text-white text-center truncate w-full leading-tight">{p.displayName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vencedores */}
                {sessao.vencedores.length > 0 && (
                  <div className="rounded-3xl overflow-hidden"
                    style={{ background: "rgba(6,4,18,0.9)", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 0 30px rgba(255,186,0,0.05)" }}>
                    <div className="px-5 py-3.5 border-b border-white/5">
                      <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest">🏆 Vencedores</p>
                    </div>
                    <div className="p-4 space-y-2.5">
                      {sessao.vencedores.map((v, i) => {
                        const pag = sessao.pagamentos.find(p => p.username === v.username);
                        return (
                          <div key={v.username} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                            style={{ background: "rgba(255,186,0,0.04)", border: "1px solid rgba(255,186,0,0.12)" }}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-black flex-shrink-0"
                              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                              {i + 1}
                            </span>
                            <Avatar image={v.image} name={v.displayName} size={36} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-white truncate">{v.displayName}</p>
                              <p className="text-[10px] text-gray-600">@{v.username}</p>
                            </div>
                            {pag && <PayBadge status={pag.status} erro={pag.erro} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-2 flex-wrap">
                  {sessao.status === "aberta" && (
                    <>
                      <button onClick={sortear} disabled={busy || sessao.participantes.length === 0}
                        className="flex-1 min-w-[160px] py-3 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.2)" }}>
                        {busy ? "..." : "🎲 Sortear vencedores"}
                      </button>
                      <button onClick={fecharSessao} disabled={busy}
                        className="py-3 px-4 rounded-2xl font-black text-xs transition-all hover:bg-red-500/10 disabled:opacity-50"
                        style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                        Encerrar
                      </button>
                    </>
                  )}
                  {sessao.status === "sorteada" && (
                    <>
                      <button onClick={pagar} disabled={busy}
                        className="flex-1 min-w-[160px] py-3 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.2)" }}>
                        {busy ? "Enviando PIX..." : "💸 Enviar PIX"}
                      </button>
                      <button onClick={sortear} disabled={busy}
                        className="py-3 px-4 rounded-2xl font-black text-xs transition-all disabled:opacity-50"
                        style={{ color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }}>
                        Re-sortear
                      </button>
                    </>
                  )}
                  <button onClick={limparSessao} disabled={busy}
                    className="py-3 px-4 rounded-2xl font-black text-xs transition-all hover:bg-white/5 disabled:opacity-50"
                    style={{ color: "#4b5563", border: "1px solid rgba(255,255,255,0.06)" }}>
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA CADASTROS ── */}
        {tab === "cadastros" && (
          <div className="space-y-4">
            {/* Sub-filtro */}
            <div className="flex gap-2">
              {([
                { key: "pendente",  label: "Pendentes",  count: pendentes.length,  color: "#ffba00", glow: "rgba(255,186,0,0.08)"  },
                { key: "aprovado",  label: "Aprovados",  count: aprovados.length,  color: "#4ade80", glow: "rgba(74,222,128,0.06)" },
                { key: "rejeitado", label: "Rejeitados", count: rejeitados.length, color: "#f87171", glow: "rgba(248,113,113,0.06)" },
              ] as const).map(f => {
                const isActive = cadastroFiltro === f.key;
                return (
                  <button key={f.key} onClick={() => setCadastroFiltro(f.key)}
                    className="flex-1 py-2.5 rounded-2xl text-xs font-black transition-all flex flex-col items-center gap-0.5"
                    style={isActive
                      ? { background: `rgba(${f.color === "#ffba00" ? "255,186,0" : f.color === "#4ade80" ? "74,222,128" : "248,113,113"},0.1)`, color: f.color, border: `1px solid ${f.color}33`, boxShadow: `0 0 20px ${f.glow}` }
                      : { color: "#374151", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span>{f.label}</span>
                    <span className="text-base font-black" style={isActive ? { color: f.color } : { color: "#374151" }}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lista */}
            {(() => {
              const lista = cadastroFiltro === "pendente" ? pendentes : cadastroFiltro === "aprovado" ? aprovados : rejeitados;
              const labels = { pendente: "pendentes", aprovado: "aprovados", rejeitado: "rejeitados" };
              if (lista.length === 0) return (
                <div className="text-center py-16">
                  <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-3xl">📋</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">Nenhum cadastro {labels[cadastroFiltro]}</p>
                </div>
              );
              return (
                <div className="space-y-3">
                  {lista.map(c => (
                    <CadastroCard key={c.id} c={c}
                      onAprovar={() => aprovar(c.id)}
                      onRejeitar={(motivo) => rejeitar(c.id, motivo)}
                      onVerFoto={() => setScreenshotModalId(c.id)}
                      onCpfEditado={(cpf) => atualizarCpfLocal(c.id, cpf)} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── ABA HISTÓRICO ── */}
        {tab === "historico" && (
          <div className="space-y-3">
            {historico.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-3xl">📜</span>
                </div>
                <p className="text-sm font-bold text-gray-600">Nenhuma gorjeta enviada ainda</p>
              </div>
            )}
            {historico.map((h, idx) => (
              <div key={h.id} className="rounded-3xl overflow-hidden"
                style={{ background: "rgba(6,4,18,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Header */}
                <div className="px-5 py-4 flex items-center gap-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs text-black"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                    #{historico.length - idx}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">
                      R$ {h.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × {h.pagamentos.length} vencedores
                    </p>
                    <p className="text-[10px] text-gray-600">{new Date(h.fechadaEm).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Total enviado</p>
                    <p className="text-base font-black" style={{
                      background: "linear-gradient(135deg, #ffba00, #ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>R$ {h.totalEnviado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                {/* Pagamentos */}
                <div className="px-5 py-3 space-y-2">
                  {h.pagamentos.map((p, i) => (
                    <div key={p.username} className="flex items-center gap-3 py-1.5">
                      <span className="text-xs text-gray-700 w-4 text-center font-bold">{i + 1}</span>
                      <span className="text-xs font-black text-white flex-1 truncate">{p.displayName}</span>
                      <PayBadge status={p.status} erro={p.erro} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
