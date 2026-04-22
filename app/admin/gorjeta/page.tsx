"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { CadastroGorjeta, SessaoGorjeta } from "@/lib/gorjeta-store";

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function StatusBadge({ status }: { status: "pendente" | "aprovado" | "rejeitado" }) {
  const map = {
    pendente: { label: "Pendente", color: "#ffba00", bg: "rgba(255,186,0,0.1)", border: "rgba(255,186,0,0.25)" },
    aprovado: { label: "Aprovado", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
    rejeitado: { label: "Rejeitado", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function PayStatusBadge({ status }: { status: "enviado" | "falhou" | "nao_cadastrado" }) {
  const map = {
    enviado: { label: "PIX enviado ✓", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
    falhou: { label: "Falhou", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
    nao_cadastrado: { label: "Não cadastrado", color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function ScreenshotModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/gorjeta?screenshot=${id}`)
      .then(r => r.json())
      .then(d => setSrc(d.screenshot ?? null))
      .catch(() => setSrc(null));
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-lg w-full rounded-2xl overflow-hidden"
        style={{ background: "rgba(8,6,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <span className="text-sm font-black text-white">Comprovante</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {src
            ? <img src={src} alt="comprovante" className="w-full rounded-xl object-contain max-h-[70vh]" />
            : <div className="h-40 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
          }
        </div>
      </div>
    </div>
  );
}

function CadastroCard({ c, onAprovar, onRejeitar, onVerFoto }: {
  c: CadastroGorjeta;
  onAprovar: () => void;
  onRejeitar: () => void;
  onVerFoto: () => void;
}) {
  const [rejMotivo, setRejMotivo] = useState("");
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-white">{c.displayName}</span>
            <span className="text-xs text-gray-600">@{c.username}</span>
            <StatusBadge status={c.status} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Nome</p>
              <p className="text-xs font-bold text-white">{c.nomeCompleto}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">CPF</p>
              <p className="text-xs font-bold text-white">{formatCpf(c.cpf)}</p>
            </div>
          </div>
          {c.motivoRejeicao && (
            <p className="text-xs text-red-400">Motivo: {c.motivoRejeicao}</p>
          )}
          <p className="text-[10px] text-gray-600">{new Date(c.criadoEm).toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button onClick={onVerFoto}
            className="px-3 py-1.5 rounded-lg text-[11px] font-black text-gray-300 transition-colors hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            📎 Ver foto
          </button>
          {c.status !== "aprovado" && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await Promise.resolve(); onAprovar(); setBusy(false); }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-black text-green-400 transition-colors hover:bg-green-500/10 disabled:opacity-50"
              style={{ border: "1px solid rgba(34,197,94,0.25)" }}>
              ✓ Aprovar
            </button>
          )}
          {c.status !== "rejeitado" && (
            <button
              onClick={() => setShowRejeitar(s => !s)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-black text-red-400 transition-colors hover:bg-red-500/10"
              style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
              ✕ Rejeitar
            </button>
          )}
        </div>
      </div>
      {showRejeitar && (
        <div className="px-5 pb-4 flex gap-2 border-t border-white/5 pt-3">
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={rejMotivo}
            onChange={e => setRejMotivo(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-xs text-white placeholder-gray-600 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await Promise.resolve(); onRejeitar(); setBusy(false); setShowRejeitar(false); }}
            className="px-3 py-2 rounded-lg text-xs font-black text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
            Confirmar
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
  const [rejMotivos, setRejMotivos] = useState<Record<string, string>>({});
  const [diagResult, setDiagResult] = useState<{ ok: boolean; diag?: Record<string, unknown>; erro?: string; resultado?: Record<string, unknown> } | null>(null);
  const [testCpf, setTestCpf] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  const fetchAll = useCallback(async () => {
    const [gRes, cRes] = await Promise.all([
      fetch("/api/gorjeta"),
      fetch("/api/gorjeta?tipo=cadastros"),
    ]);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error ?? "Erro", "err"); return null; }
      await fetchAll();
      return data;
    } catch { flash("Erro de conexão", "err"); return null; }
    finally { setBusy(false); }
  }

  async function testarPix() {
    setBusy(true);
    setDiagResult(null);
    try {
      const res = await fetch("/api/gorjeta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "testar-pix", cpf: testCpf, valor: 0.01 }),
      });
      const data = await res.json();
      setDiagResult(data as { ok: boolean; diag?: Record<string, unknown>; erro?: string; resultado?: Record<string, unknown> });
    } catch { setDiagResult({ ok: false, erro: "Erro de conexão" }); }
    finally { setBusy(false); }
  }

  async function aprovar(id: string) {
    const r = await apiCall({ action: "aprovar", id });
    if (r) flash("Cadastro aprovado!", "ok");
  }

  async function rejeitar(id: string, motivo: string) {
    const r = await apiCall({ action: "rejeitar", id, motivo });
    if (r) flash("Cadastro rejeitado", "ok");
  }

  async function abrirSessao() {
    const r = await apiCall({
      action: "abrir-sessao",
      valorUnitario: Number(formSessao.valorUnitario.replace(",", ".")),
      maxVencedores: Number(formSessao.maxVencedores),
    });
    if (r) flash("Sessão aberta! Digam !gorjeta no chat.", "ok");
  }

  async function sortear() {
    const r = await apiCall({ action: "sortear" });
    if (r) flash("Vencedores sorteados!", "ok");
  }

  async function pagar() {
    const r = await apiCall({ action: "pagar" });
    if (r) flash(`PIX enviados! Sucesso: ${r.pagamentos?.filter((p: { status: string }) => p.status === "enviado").length ?? 0}`, "ok");
  }

  async function fecharSessao() {
    const r = await apiCall({ action: "fechar-sessao" });
    if (r) flash("Sessão encerrada", "ok");
  }

  async function limparSessao() {
    const r = await apiCall({ action: "limpar-sessao" });
    if (r) flash("Sessão removida", "ok");
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  const pendentes = cadastros.filter(c => c.status === "pendente");
  const outros = cadastros.filter(c => c.status !== "pendente");

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      {screenshotModalId && <ScreenshotModal id={screenshotModalId} onClose={() => setScreenshotModalId(null)} />}

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24">
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Admin · Gorjeta</span>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-black text-white flex-1">Admin · Gorjeta</h1>
          {msg && (
            <span className={`text-xs font-black px-3 py-1.5 rounded-full ${msg.type === "ok" ? "text-green-400 bg-green-500/10 border border-green-500/25" : "text-red-400 bg-red-500/10 border border-red-500/25"}`}>
              {msg.text}
            </span>
          )}
        </div>

        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["sessao", "cadastros", "historico"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-black transition-all relative"
              style={tab === t
                ? { background: "rgba(255,186,0,0.12)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }
                : { color: "#6b7280" }}>
              {t === "sessao" ? "Sessão" : t === "cadastros" ? `Cadastros${pendentes.length > 0 ? ` (${pendentes.length})` : ""}` : "Histórico"}
            </button>
          ))}
        </div>

        {tab === "sessao" && (
          <div className="space-y-4">
            {!sessao || sessao.status === "fechada" ? (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,186,0,0.18)", backdropFilter: "blur(12px)" }}>
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-sm font-black text-white">Abrir sessão de gorjeta</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Valor por vencedor (R$)</label>
                      <input type="text" value={formSessao.valorUnitario}
                        onChange={e => setFormSessao(f => ({ ...f, valorUnitario: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Qtd. vencedores</label>
                      <input type="number" min="1" max="20" value={formSessao.maxVencedores}
                        onChange={e => setFormSessao(f => ({ ...f, maxVencedores: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                  </div>
                  <button onClick={abrirSessao} disabled={busy}
                    className="w-full py-3 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                    {busy ? "Abrindo..." : "Abrir gorjeta 💰"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,6,20,0.75)", border: "1px solid rgba(255,186,0,0.22)", backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-white/5">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    {sessao.status === "aberta" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffba00] opacity-60" />}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffba00]" />
                  </span>
                  <span className="text-[11px] font-black text-[#ffba00] uppercase tracking-widest flex-1">
                    {sessao.status === "aberta" ? "Sessão aberta" : "Sorteada — aguardando pagamento"}
                  </span>
                  <span className="text-[11px] text-gray-600">
                    R$ {sessao.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × {sessao.maxVencedores}
                  </span>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Participantes</p>
                      <p className="text-2xl font-black text-white">{sessao.participantes.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Vencedores</p>
                      <p className="text-2xl font-black text-white">{sessao.maxVencedores}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Total máx.</p>
                      <p className="text-2xl font-black" style={{
                        background: "linear-gradient(135deg, #ffba00, #ffdd55)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      }}>R$ {(sessao.valorUnitario * sessao.maxVencedores).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {sessao.participantes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Participantes</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {sessao.participantes.map((p, i) => (
                          <div key={p.username} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <span className="text-[10px] text-gray-600 w-5 text-right">{i + 1}</span>
                            {p.image
                              ? <img src={p.image} alt={p.displayName} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                              : <div className="w-5 h-5 rounded-full bg-[#ffba00]/10 flex items-center justify-center text-[8px] font-black text-[#ffba00] flex-shrink-0">{p.displayName[0].toUpperCase()}</div>
                            }
                            <span className="text-xs font-bold text-white flex-1 truncate">{p.displayName}</span>
                            <span className="text-[10px] text-gray-600">{formatCpf(p.cpf)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessao.vencedores.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Vencedores</p>
                      <div className="space-y-2">
                        {sessao.vencedores.map((v, i) => {
                          const pag = sessao.pagamentos.find(p => p.username === v.username);
                          return (
                            <div key={v.username} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                              style={{ background: "rgba(255,186,0,0.05)", border: "1px solid rgba(255,186,0,0.12)" }}>
                              <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
                                {i + 1}
                              </span>
                              {v.image
                                ? <img src={v.image} alt={v.displayName} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-6 h-6 rounded-full bg-[#ffba00]/10 flex items-center justify-center text-[10px] font-black text-[#ffba00] flex-shrink-0">{v.displayName[0].toUpperCase()}</div>
                              }
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-white truncate">{v.displayName}</p>
                                <p className="text-[10px] text-gray-600">{formatCpf(v.cpf)}</p>
                              </div>
                              {pag && <PayStatusBadge status={pag.status as "enviado" | "falhou" | "nao_cadastrado"} />}
                              {pag?.erro && (
                                <span className="text-[10px] text-red-400 break-all" title={pag.erro}>{pag.erro}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap pt-1">
                    {sessao.status === "aberta" && (
                      <>
                        <button onClick={sortear} disabled={busy || sessao.participantes.length === 0}
                          className="flex-1 min-w-[140px] py-2.5 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                          {busy ? "..." : "🎲 Sortear"}
                        </button>
                        <button onClick={fecharSessao} disabled={busy}
                          className="py-2.5 px-4 rounded-xl font-black text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
                          Encerrar sem sortear
                        </button>
                      </>
                    )}
                    {sessao.status === "sorteada" && (
                      <>
                        <button onClick={pagar} disabled={busy}
                          className="flex-1 min-w-[140px] py-2.5 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                          {busy ? "Enviando..." : "💸 Enviar PIX"}
                        </button>
                        <button onClick={sortear} disabled={busy}
                          className="py-2.5 px-4 rounded-xl font-black text-xs text-[#ffba00] transition-colors hover:bg-[#ffba00]/10 disabled:opacity-50"
                          style={{ border: "1px solid rgba(255,186,0,0.25)" }}>
                          Re-sortear
                        </button>
                      </>
                    )}
                    <button onClick={limparSessao} disabled={busy}
                      className="py-2.5 px-4 rounded-xl font-black text-xs text-gray-500 transition-colors hover:bg-white/5 disabled:opacity-50"
                      style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Painel de diagnóstico PIX */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(8,6,20,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">🔧 Diagnóstico PIX</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="CPF do destinatário (para teste R$0,01)"
                    value={testCpf}
                    onChange={e => setTestCpf(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-white placeholder-gray-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <button onClick={testarPix} disabled={busy}
                    className="px-4 py-2 rounded-lg text-xs font-black text-[#ffba00] transition-colors hover:bg-[#ffba00]/10 disabled:opacity-50 flex-shrink-0"
                    style={{ border: "1px solid rgba(255,186,0,0.25)" }}>
                    {busy ? "..." : "Testar"}
                  </button>
                </div>
                {diagResult && (
                  <div className="space-y-2">
                    <div className={`px-3 py-2 rounded-lg text-xs font-black ${diagResult.ok ? "text-green-400 bg-green-500/10 border border-green-500/25" : "text-red-400 bg-red-500/10 border border-red-500/25"}`}>
                      {diagResult.ok ? "✓ PIX enviado com sucesso!" : `✕ Erro: ${diagResult.erro}`}
                    </div>
                    {diagResult.diag && (
                      <div className="rounded-lg px-3 py-2 space-y-1"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Variáveis de ambiente</p>
                        {Object.entries(diagResult.diag).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v === true ? "bg-green-500" : v === false ? "bg-red-500" : "bg-yellow-500"}`} />
                            <span className="text-[10px] text-gray-500 font-mono flex-1">{k}</span>
                            <span className={`text-[10px] font-black ${v === true ? "text-green-400" : v === false ? "text-red-400" : "text-yellow-400"}`}>
                              {v === true ? "✓ configurada" : v === false ? "✕ faltando" : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {diagResult.resultado && (
                      <div className="rounded-lg px-3 py-2"
                        style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                        <p className="text-[10px] font-black text-green-400 mb-1">Resposta EfíBank</p>
                        <pre className="text-[10px] text-gray-400 overflow-auto">{JSON.stringify(diagResult.resultado, null, 2) as string}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "cadastros" && (
          <div className="space-y-3">
            {cadastros.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <span className="text-4xl block mb-3">📋</span>
                <p className="text-sm font-bold">Nenhum cadastro ainda</p>
              </div>
            )}
            {pendentes.length > 0 && (
              <>
                <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest px-1">Pendentes ({pendentes.length})</p>
                {pendentes.map(c => (
                  <CadastroCard key={c.id} c={c}
                    onAprovar={() => aprovar(c.id)}
                    onRejeitar={() => rejeitar(c.id, rejMotivos[c.id] ?? "")}
                    onVerFoto={() => setScreenshotModalId(c.id)} />
                ))}
              </>
            )}
            {outros.length > 0 && (
              <>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1 mt-4">Outros ({outros.length})</p>
                {outros.map(c => (
                  <CadastroCard key={c.id} c={c}
                    onAprovar={() => aprovar(c.id)}
                    onRejeitar={() => rejeitar(c.id, rejMotivos[c.id] ?? "")}
                    onVerFoto={() => setScreenshotModalId(c.id)} />
                ))}
              </>
            )}
          </div>
        )}

        {tab === "historico" && (
          <div className="space-y-3">
            {historico.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <span className="text-4xl block mb-3">📜</span>
                <p className="text-sm font-bold">Nenhuma gorjeta enviada ainda</p>
              </div>
            )}
            {historico.map(h => (
              <div key={h.id} className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
                <div className="px-5 py-3 border-b border-white/5 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-black text-white">
                      R$ {h.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × {h.pagamentos.length} vencedores
                    </p>
                    <p className="text-[10px] text-gray-600">{new Date(h.fechadaEm).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Total enviado</p>
                    <p className="text-sm font-black" style={{
                      background: "linear-gradient(135deg, #ffba00, #ffdd55)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>R$ {h.totalEnviado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {h.pagamentos.map(p => (
                    <div key={p.username} className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-white flex-1">{p.displayName}</span>
                      <span className="text-[10px] text-gray-600">{formatCpf(p.cpf)}</span>
                      <PayStatusBadge status={p.status as "enviado" | "falhou" | "nao_cadastrado"} />
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
