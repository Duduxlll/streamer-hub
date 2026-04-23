"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { CadastroGorjeta, SessaoGorjeta, ParticipanteSessao, TransacaoGorjeta } from "@/lib/gorjeta-store";

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
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }

function Avatar({ image, name, size = 32 }: { image: string | null; name: string; size?: number }) {
  if (image) return (
    <img src={image} alt={name} className="rounded-full object-cover flex-shrink-0"
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
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
      ✓ enviado
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap" title={erro}
      style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
      ✕ falhou
    </span>
  );
}

function ScreenshotModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/gorjeta?screenshot=${id}`).then(r => r.json()).then(d => setSrc(d.screenshot ?? null)).catch(() => setSrc(null));
  }, [id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="relative max-w-lg w-full rounded-3xl overflow-hidden"
        style={{ background: "rgba(6,4,18,0.98)", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 0 60px rgba(255,186,0,0.08)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <span className="text-sm font-black text-white">Comprovante de depósito</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors hover:bg-white/5">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
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

// ─── Modal de sorteio animado ─────────────────────────────────────────────

function SortearModal({ participantes, vencedores, onPagar, onClose }: {
  participantes: ParticipanteSessao[];
  vencedores: ParticipanteSessao[];
  onPagar: () => void;
  onClose: () => void;
}) {
  const [spinDisplay, setSpinDisplay] = useState<ParticipanteSessao>(participantes[0] ?? vencedores[0]);
  const [revealedWinners, setRevealedWinners] = useState<ParticipanteSessao[]>([]);
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    if (participantes.length === 0) { setRevealedWinners(vencedores); setDone(true); return; }

    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    async function run() {
      await sleep(400);
      for (let wi = 0; wi < vencedores.length; wi++) {
        if (cancelRef.current) return;
        const winner = vencedores[wi];
        const start = Date.now();
        const dur = 1800;

        while (Date.now() - start < dur) {
          if (cancelRef.current) return;
          const elapsed = Date.now() - start;
          const speed = elapsed > dur * 0.55 ? Math.min(350, 75 + (elapsed - dur * 0.55) * 1.8) : 75;
          setSpinDisplay(participantes[Math.floor(Math.random() * participantes.length)]);
          await sleep(speed);
        }

        if (cancelRef.current) return;
        setSpinDisplay(winner);
        await sleep(500);
        if (cancelRef.current) return;
        setRevealedWinners(prev => [...prev, winner]);
        await sleep(900);
      }
      if (!cancelRef.current) setDone(true);
    }

    run();
    return () => { cancelRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unrevealed = vencedores.length - revealedWinners.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "rgba(6,4,18,0.98)", border: "1px solid rgba(255,186,0,0.3)", boxShadow: "0 0 80px rgba(255,186,0,0.1)" }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-white/5">
          <div className="text-2xl mb-1">🎲</div>
          <h2 className="text-lg font-black text-white">
            {done ? "Vencedores sorteados!" : "Sorteando..."}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {done ? `${vencedores.length} vencedor${vencedores.length !== 1 ? "es" : ""}` : `Revelando ${unrevealed} vencedor${unrevealed !== 1 ? "es" : ""}...`}
          </p>
        </div>

        {/* Slot machine */}
        {!done && (
          <div className="px-6 py-6 flex flex-col items-center gap-3">
            <div className="relative w-full rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,186,0,0.04)", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 0 30px rgba(255,186,0,0.08)" }}>
              {spinDisplay.image && (
                <img src={spinDisplay.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ filter: "blur(20px) brightness(0.15)", transform: "scale(1.4)" }} />
              )}
              <div className="relative z-10 flex flex-col items-center gap-3 py-8 px-4">
                <div style={{ transition: "all 0.08s" }}>
                  <Avatar image={spinDisplay.image} name={spinDisplay.displayName} size={72} />
                </div>
                <p className="text-base font-black text-white text-center"
                  style={{ textShadow: "0 0 20px rgba(255,186,0,0.5)" }}>
                  {spinDisplay.displayName}
                </p>
              </div>
            </div>
            {/* Spinning indicator */}
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#ffba00] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s`, opacity: 0.7 }} />
              ))}
            </div>
          </div>
        )}

        {/* Vencedores revelados */}
        {revealedWinners.length > 0 && (
          <div className="px-5 pb-4 space-y-2">
            {!done && <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest px-1 mb-2">Revelados</p>}
            {revealedWinners.map((w, i) => (
              <div key={w.username}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)",
                  animation: "fadeInUp 0.4s ease-out",
                }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-black flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                  {i + 1}
                </span>
                <Avatar image={w.image} name={w.displayName} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{w.displayName}</p>
                  <p className="text-[10px] text-gray-600">@{w.username}</p>
                </div>
                <span className="text-lg">🏆</span>
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="px-5 pb-6 space-y-2 border-t border-white/5 pt-4">
          {done && (
            <button onClick={onPagar}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.3)" }}>
              💸 Enviar PIX para os vencedores
            </button>
          )}
          <button onClick={onClose}
            className="w-full py-2.5 rounded-2xl font-black text-xs transition-all hover:bg-white/5"
            style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.06)" }}>
            {done ? "Fechar" : "Cancelar sorteio"}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ─── Card de cadastro ─────────────────────────────────────────────────────

function CadastroCard({ c, onAprovar, onRejeitar, onVerFoto, onCpfEditado }: {
  c: CadastroGorjeta;
  onAprovar: () => void;
  onRejeitar: (motivo: string) => void;
  onVerFoto: () => void;
  onCpfEditado: (cpf: string) => void;
}) {
  const [rejMotivo, setRejMotivo] = useState("");
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [cpfEdit, setCpfEdit] = useState("");
  const [busy, setBusy] = useState(false);
  const [editErr, setEditErr] = useState("");

  const borderColor = c.status === "aprovado" ? "rgba(74,222,128,0.2)" : c.status === "rejeitado" ? "rgba(248,113,113,0.15)" : "rgba(255,186,0,0.15)";

  async function salvarCpf() {
    const d = cpfEdit.replace(/\D/g, "");
    if (d.length !== 11) { setEditErr("CPF inválido (11 dígitos)"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/gorjeta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "editar-cpf", id: c.id, cpf: d }) });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error ?? "Erro"); return; }
      onCpfEditado(d); setShowEdit(false);
    } catch { setEditErr("Erro de conexão"); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: "rgba(6,4,18,0.9)", border: `1px solid ${borderColor}` }}>
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-black text-white">{c.displayName}</span>
            <span className="text-[11px] text-gray-600">@{c.username}</span>
            <StatusBadge status={c.status} />
          </div>
          <span className="text-[10px] text-gray-600">{new Date(c.criadoEm).toLocaleString("pt-BR")}</span>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onVerFoto} className="px-2.5 py-1.5 rounded-xl text-[11px] font-black text-gray-400 hover:text-white transition-all hover:bg-white/5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>📎</button>
          <button onClick={() => { setCpfEdit(formatCpfInput(c.cpf)); setEditErr(""); setShowEdit(s => !s); setShowRejeitar(false); }}
            className="px-2.5 py-1.5 rounded-xl text-[11px] transition-all hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: showEdit ? "#ffba00" : "#6b7280" }}>✏️</button>
        </div>
      </div>
      <div className="px-5 pb-3 grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
        <div><p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Nome</p><p className="text-xs font-bold text-white truncate">{c.nomeCompleto}</p></div>
        <div><p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">PIX</p><p className="text-xs font-bold text-white">{mascarCpf(c.cpf)}</p></div>
      </div>
      {c.motivoRejeicao && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-xl text-xs text-red-400" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
          Motivo: {c.motivoRejeicao}
        </div>
      )}
      <div className="px-5 pb-4 flex gap-2 border-t border-white/5 pt-3">
        {c.status !== "aprovado" && (
          <button disabled={busy} onClick={async () => { setBusy(true); await Promise.resolve(); onAprovar(); setBusy(false); }}
            className="flex-1 py-2 rounded-xl text-xs font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.15))", border: "1px solid rgba(74,222,128,0.3)" }}>
            ✓ Aprovar
          </button>
        )}
        <button onClick={() => { setShowRejeitar(s => !s); setShowEdit(false); }}
          className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
          style={{ color: showRejeitar ? "#f87171" : "#6b7280", background: showRejeitar ? "rgba(248,113,113,0.1)" : "transparent", border: "1px solid rgba(248,113,113,0.2)" }}>
          {c.status === "aprovado" ? "Revogar" : "✕ Rejeitar"}
        </button>
      </div>
      {showEdit && (
        <div className="px-5 pb-4 space-y-2 border-t border-[#ffba00]/10 pt-3" style={{ background: "rgba(255,186,0,0.025)" }}>
          <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest">Editar PIX / CPF</p>
          <div className="flex gap-2">
            <input type="text" inputMode="numeric" placeholder="000.000.000-00" value={cpfEdit}
              onChange={e => { setCpfEdit(formatCpfInput(e.target.value)); setEditErr(""); }}
              className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-gray-600 outline-none"
              style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.3)" }} />
            <button disabled={busy} onClick={salvarCpf} className="px-4 py-2 rounded-xl text-xs font-black text-black disabled:opacity-50" style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>{busy ? "..." : "Salvar"}</button>
            <button onClick={() => { setShowEdit(false); setEditErr(""); }} className="px-3 py-2 rounded-xl text-xs font-black text-gray-500 hover:text-white transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>✕</button>
          </div>
          {editErr && <p className="text-xs text-red-400 font-bold">{editErr}</p>}
        </div>
      )}
      {showRejeitar && (
        <div className="px-5 pb-4 flex gap-2 border-t border-red-500/10 pt-3" style={{ background: "rgba(248,113,113,0.025)" }}>
          <input type="text" placeholder="Motivo (opcional)" value={rejMotivo} onChange={e => setRejMotivo(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-gray-600 outline-none"
            style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }} />
          <button disabled={busy} onClick={async () => { setBusy(true); await Promise.resolve(); onRejeitar(rejMotivo); setBusy(false); setShowRejeitar(false); }}
            className="px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, rgba(248,113,113,0.4), rgba(239,68,68,0.3))", border: "1px solid rgba(248,113,113,0.3)" }}>
            {busy ? "..." : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────

export default function AdminGorjetaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"sessao" | "cadastros" | "historico">("sessao");
  const [cadastroFiltro, setCadastroFiltro] = useState<"pendente" | "aprovado" | "rejeitado">("pendente");
  const [sessaoTab, setSessaoTab] = useState<"sortear" | "manual">("sortear");
  const [cadastros, setCadastros] = useState<CadastroGorjeta[]>([]);
  const [sessao, setSessao] = useState<SessaoGorjeta | null>(null);
  const [historico, setHistorico] = useState<Array<{ id: string; saldoTotal: number; totalEnviado: number; transacoes: TransacaoGorjeta[]; abertaEm: number; fechadaEm: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [saldoInput, setSaldoInput] = useState("200");
  const [formSort, setFormSort] = useState({ valor: "10", qtd: "3" });
  const [busca, setBusca] = useState("");
  const [manualSel, setManualSel] = useState<ParticipanteSessao | null>(null);
  const [manualValor, setManualValor] = useState("");
  const [screenshotModalId, setScreenshotModalId] = useState<string | null>(null);
  const [showSortearModal, setShowSortearModal] = useState(false);
  const [sortearVencedores, setSortearVencedores] = useState<ParticipanteSessao[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  const fetchAll = useCallback(async () => {
    const [gRes, cRes] = await Promise.all([fetch("/api/gorjeta"), fetch("/api/gorjeta?tipo=cadastros")]);
    const gData = await gRes.json(); const cData = await cRes.json();
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

  function flash(text: string, type: "ok" | "err") { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500); }

  async function apiCall(body: object) {
    setBusy(true);
    try {
      const res = await fetch("/api/gorjeta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { flash(data.error ?? "Erro", "err"); return null; }
      await fetchAll(); return data;
    } catch { flash("Erro de conexão", "err"); return null; }
    finally { setBusy(false); }
  }

  function atualizarCpfLocal(id: string, cpf: string) { setCadastros(prev => prev.map(c => c.id === id ? { ...c, cpf } : c)); flash("CPF atualizado!", "ok"); }
  async function aprovar(id: string) { const r = await apiCall({ action: "aprovar", id }); if (r) flash("Aprovado!", "ok"); }
  async function rejeitar(id: string, motivo: string) { const r = await apiCall({ action: "rejeitar", id, motivo }); if (r) flash("Rejeitado", "ok"); }

  async function abrirSessao() {
    const saldo = parseFloat(saldoInput.replace(",", "."));
    if (isNaN(saldo) || saldo <= 0) { flash("Valor inválido", "err"); return; }
    const r = await apiCall({ action: "abrir-sessao", saldoTotal: saldo });
    if (r) flash("Sessão aberta! 💰", "ok");
  }

  async function sortear() {
    const valor = parseFloat(formSort.valor.replace(",", "."));
    const qtd = parseInt(formSort.qtd);
    if (isNaN(valor) || valor <= 0) { flash("Valor por vencedor inválido", "err"); return; }
    if (isNaN(qtd) || qtd <= 0) { flash("Quantidade inválida", "err"); return; }
    const r = await apiCall({ action: "sortear", valorUnitario: valor, maxVencedores: qtd });
    if (r?.sessao?.vencedores) {
      setSortearVencedores(r.sessao.vencedores);
      setShowSortearModal(true);
    }
  }

  async function pagar() {
    const r = await apiCall({ action: "pagar" });
    if (r) {
      setShowSortearModal(false);
      flash(`PIX enviados! ✓ ${r.pagamentos?.filter((p: { status: string }) => p.status === "enviado").length ?? 0}`, "ok");
    }
  }

  async function enviarManual() {
    if (!manualSel) return;
    const valor = parseFloat(manualValor.replace(",", "."));
    if (isNaN(valor) || valor <= 0) { flash("Valor inválido", "err"); return; }
    const r = await apiCall({ action: "enviar-manual", username: manualSel.username, valor });
    if (r) {
      flash(r.result?.status === "enviado" ? `PIX enviado para ${manualSel.displayName}! ✓` : `Falha ao enviar para ${manualSel.displayName}`, r.result?.status === "enviado" ? "ok" : "err");
      setManualSel(null); setManualValor("");
    }
  }

  async function fecharSessao() { const r = await apiCall({ action: "fechar-sessao" }); if (r) flash("Gorjeta encerrada", "ok"); }
  async function limparSessao() { const r = await apiCall({ action: "limpar-sessao" }); if (r) flash("Removida", "ok"); }

  if (loading || status === "loading") return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid rgba(255,186,0,0.15)", borderTopColor: "#ffba00" }} />
    </div>
  );

  const pendentes  = cadastros.filter(c => c.status === "pendente");
  const aprovados  = cadastros.filter(c => c.status === "aprovado");
  const rejeitados = cadastros.filter(c => c.status === "rejeitado");

  const participantesFiltrados = sessao?.participantes.filter(p =>
    !busca || p.displayName.toLowerCase().includes(busca.toLowerCase()) || p.username.toLowerCase().includes(busca.toLowerCase())
  ) ?? [];

  const pctGasto = sessao ? ((sessao.saldoTotal - sessao.saldoRestante) / sessao.saldoTotal) * 100 : 0;

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(ellipse, #ffba00, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {screenshotModalId && <ScreenshotModal id={screenshotModalId} onClose={() => setScreenshotModalId(null)} />}
      {showSortearModal && sessao && (
        <SortearModal
          participantes={sessao.participantes}
          vencedores={sortearVencedores}
          onPagar={pagar}
          onClose={() => setShowSortearModal(false)} />
      )}

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24">
        <div className="flex items-center gap-2 text-xs text-gray-700 mb-8">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span className="text-gray-800">/</span>
          <span className="text-gray-500">Admin · Gorjeta</span>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Gorjeta</h1>
            <p className="text-sm text-gray-600 mt-0.5">Painel de administração</p>
          </div>
          {msg && (
            <div className={`px-4 py-2 rounded-xl text-xs font-black ${msg.type === "ok" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25" : "text-red-400 bg-red-500/10 border border-red-500/25"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Tabs principais */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {(["sessao", "cadastros", "historico"] as const).map(t => {
            const labels = { sessao: "Sessão", cadastros: "Cadastros", historico: "Histórico" };
            return (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all relative"
                style={tab === t
                  ? { background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 0 20px rgba(255,186,0,0.06)" }
                  : { color: "#4b5563" }}>
                {labels[t]}
                {t === "cadastros" && pendentes.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ffba00]" style={{ boxShadow: "0 0 6px #ffba00" }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── ABA SESSÃO ── */}
        {tab === "sessao" && (
          <div className="space-y-4">
            {!sessao || sessao.status === "fechada" ? (
              /* Abrir sessão */
              <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,4,18,0.9)", border: "1px solid rgba(255,186,0,0.15)", boxShadow: "0 0 40px rgba(255,186,0,0.04)" }}>
                <div className="px-6 py-5 border-b border-white/5">
                  <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest mb-1">Nova sessão</p>
                  <h2 className="text-lg font-black text-white">Abrir gorjeta</h2>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2">Saldo total da gorjeta (R$)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#ffba00]">R$</span>
                      <input type="text" inputMode="decimal" value={saldoInput}
                        onChange={e => setSaldoInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl text-xl font-black text-white placeholder-gray-700 outline-none"
                        style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.25)" }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Você vai distribuir esse valor entre os participantes via sorteio ou envio manual.</p>
                  </div>
                  <button onClick={abrirSessao} disabled={busy}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.25)" }}>
                    {busy ? "Abrindo..." : "💰 Abrir gorjeta"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status + saldo */}
                <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,4,18,0.95)", border: "1px solid rgba(255,186,0,0.25)", boxShadow: "0 0 50px rgba(255,186,0,0.06)" }}>
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      {sessao.status === "aberta" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffba00] opacity-75" />}
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffba00]" />
                    </span>
                    <span className="text-sm font-black text-white flex-1">
                      {sessao.status === "aberta" ? "Gorjeta ao vivo" : "Sorteio pendente"}
                    </span>
                    {sessao.status === "aberta" && (
                      <span className="text-[11px] font-black px-3 py-1 rounded-full text-black" style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>LIVE</span>
                    )}
                  </div>

                  {/* Saldo */}
                  <div className="px-6 py-5 space-y-3">
                    <div className="flex items-end justify-between mb-1">
                      <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Saldo restante</p>
                        <p className="text-3xl font-black" style={{ background: "linear-gradient(135deg, #ffba00, #ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          R$ {fmtBRL(sessao.saldoRestante)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Total inicial</p>
                        <p className="text-sm font-black text-gray-500">R$ {fmtBRL(sessao.saldoTotal)}</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pctGasto)}%`, background: pctGasto > 80 ? "linear-gradient(90deg, #ef4444, #f87171)" : "linear-gradient(90deg, #ffba00, #ffdd55)" }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-600">
                      <span>{sessao.participantes.length} inscritos</span>
                      <span>{sessao.transacoes.filter(t => t.status === "enviado").length} PIX enviados</span>
                    </div>
                  </div>
                </div>

                {/* Participantes */}
                {sessao.participantes.length > 0 && (
                  <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,4,18,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex-1">Inscritos</p>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)" }}>{sessao.participantes.length}</span>
                    </div>
                    <div className="p-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                      <div className="flex gap-2.5" style={{ width: "max-content" }}>
                        {sessao.participantes.map(p => (
                          <div key={p.username} className="relative overflow-hidden rounded-2xl flex flex-col items-center flex-shrink-0"
                            style={{ width: 88, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {p.image && <img src={p.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ filter: "blur(10px) brightness(0.18)", transform: "scale(1.3)" }} />}
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

                {/* Tabs sortear / manual */}
                <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,4,18,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {/* Sub-tabs */}
                  <div className="flex border-b border-white/5">
                    {(["sortear", "manual"] as const).map(t => (
                      <button key={t} onClick={() => setSessaoTab(t)}
                        className="flex-1 py-3.5 text-xs font-black transition-all"
                        style={sessaoTab === t
                          ? { color: "#ffba00", borderBottom: "2px solid #ffba00" }
                          : { color: "#4b5563", borderBottom: "2px solid transparent" }}>
                        {t === "sortear" ? "🎲 Sortear" : "✍️ Envio manual"}
                      </button>
                    ))}
                  </div>

                  {/* Sortear */}
                  {sessaoTab === "sortear" && (
                    <div className="px-5 py-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Valor por vencedor (R$)</label>
                          <input type="text" inputMode="decimal" value={formSort.valor}
                            onChange={e => setFormSort(f => ({ ...f, valor: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Nº de vencedores</label>
                          <input type="number" min="1" max="20" value={formSort.qtd}
                            onChange={e => setFormSort(f => ({ ...f, qtd: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                        </div>
                      </div>
                      {(() => {
                        const v = parseFloat(formSort.valor.replace(",",".")), q = parseInt(formSort.qtd);
                        const custo = (!isNaN(v) && !isNaN(q)) ? v * q : 0;
                        return custo > 0 && (
                          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,186,0,0.04)", border: "1px solid rgba(255,186,0,0.1)" }}>
                            <span className="text-xs text-gray-500">Custo do sorteio</span>
                            <span className="text-sm font-black" style={{ color: custo > (sessao?.saldoRestante ?? 0) ? "#f87171" : "#ffba00" }}>
                              R$ {fmtBRL(custo)}
                            </span>
                          </div>
                        );
                      })()}
                      <button onClick={sortear} disabled={busy || sessao.participantes.length === 0}
                        className="w-full py-3 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.2)" }}>
                        {busy ? "..." : sessao.participantes.length === 0 ? "Aguardando inscritos..." : "🎲 Iniciar sorteio"}
                      </button>
                    </div>
                  )}

                  {/* Manual */}
                  {sessaoTab === "manual" && (
                    <div className="px-5 py-5 space-y-3">
                      <input type="text" placeholder="Buscar participante..." value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />

                      {sessao.participantes.length === 0 && (
                        <div className="text-center py-8 text-gray-600 text-sm">Nenhum inscrito ainda</div>
                      )}

                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {participantesFiltrados.map(p => {
                          const isSel = manualSel?.username === p.username;
                          const jaEnviou = sessao.transacoes.filter(t => t.username === p.username && t.status === "enviado").reduce((s, t) => s + t.valor, 0);
                          return (
                            <button key={p.username} onClick={() => { setManualSel(isSel ? null : p); setManualValor(""); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                              style={isSel
                                ? { background: "rgba(255,186,0,0.1)", border: "1px solid rgba(255,186,0,0.3)" }
                                : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <Avatar image={p.image} name={p.displayName} size={32} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-white truncate">{p.displayName}</p>
                                <p className="text-[10px] text-gray-600">@{p.username}</p>
                              </div>
                              {jaEnviou > 0 && (
                                <span className="text-[10px] font-black text-green-400">+R${fmtBRL(jaEnviou)}</span>
                              )}
                              {isSel && <span className="text-[#ffba00] text-sm">✓</span>}
                            </button>
                          );
                        })}
                      </div>

                      {manualSel && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)" }}>
                          <div className="px-4 py-3 flex items-center gap-3 border-b border-[#ffba00]/10">
                            <Avatar image={manualSel.image} name={manualSel.displayName} size={28} />
                            <p className="text-xs font-black text-white flex-1">{manualSel.displayName}</p>
                            <button onClick={() => setManualSel(null)} className="text-gray-600 hover:text-gray-400 text-sm">✕</button>
                          </div>
                          <div className="px-4 py-3 flex gap-2 items-center">
                            <span className="text-sm font-black text-[#ffba00]">R$</span>
                            <input type="text" inputMode="decimal" placeholder="0,00" value={manualValor}
                              onChange={e => setManualValor(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-white placeholder-gray-600 outline-none"
                              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,186,0,0.25)" }} />
                            <button onClick={enviarManual} disabled={busy || !manualValor}
                              className="px-4 py-2 rounded-xl text-xs font-black text-black disabled:opacity-50 transition-all hover:scale-[1.02]"
                              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                              {busy ? "..." : "Enviar PIX"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Histórico de transações da sessão */}
                {sessao.transacoes.length > 0 && (
                  <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,4,18,0.8)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-5 py-3 border-b border-white/5">PIX enviados nesta sessão</p>
                    <div className="px-5 py-3 space-y-2 max-h-48 overflow-y-auto">
                      {[...sessao.transacoes].reverse().map(t => (
                        <div key={t.id} className="flex items-center gap-2.5 py-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ background: t.tipo === "manual" ? "rgba(139,92,246,0.15)" : "rgba(255,186,0,0.1)", color: t.tipo === "manual" ? "#a78bfa" : "#ffba00" }}>{t.tipo}</span>
                          <span className="text-xs font-bold text-white flex-1 truncate">{t.displayName}</span>
                          <span className="text-xs font-black text-white">R$ {fmtBRL(t.valor)}</span>
                          <PayBadge status={t.status} erro={t.erro} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botões de controle */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={fecharSessao} disabled={busy}
                    className="flex-1 py-3 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                    Fechar gorjeta
                  </button>
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
            <div className="flex gap-2">
              {([
                { key: "pendente",  label: "Pendentes",  count: pendentes.length,  color: "#ffba00" },
                { key: "aprovado",  label: "Aprovados",  count: aprovados.length,  color: "#4ade80" },
                { key: "rejeitado", label: "Rejeitados", count: rejeitados.length, color: "#f87171" },
              ] as const).map(f => {
                const isActive = cadastroFiltro === f.key;
                return (
                  <button key={f.key} onClick={() => setCadastroFiltro(f.key)}
                    className="flex-1 py-2.5 rounded-2xl text-xs font-black transition-all flex flex-col items-center gap-0.5"
                    style={isActive
                      ? { background: `${f.color}18`, color: f.color, border: `1px solid ${f.color}40`, boxShadow: `0 0 20px ${f.color}0a` }
                      : { color: "#374151", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span>{f.label}</span>
                    <span className="text-base font-black" style={isActive ? { color: f.color } : { color: "#374151" }}>{f.count}</span>
                  </button>
                );
              })}
            </div>
            {(() => {
              const lista = cadastroFiltro === "pendente" ? pendentes : cadastroFiltro === "aprovado" ? aprovados : rejeitados;
              const labels = { pendente: "pendentes", aprovado: "aprovados", rejeitado: "rejeitados" };
              if (lista.length === 0) return (
                <div className="text-center py-16">
                  <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
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
                <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-3xl">📜</span>
                </div>
                <p className="text-sm font-bold text-gray-600">Nenhuma gorjeta encerrada ainda</p>
              </div>
            )}
            {historico.map((h, idx) => (
              <div key={h.id} className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,4,18,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-5 py-4 flex items-center gap-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs text-black" style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>#{historico.length - idx}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">Saldo R$ {fmtBRL(h.saldoTotal)}</p>
                    <p className="text-[10px] text-gray-600">{new Date(h.fechadaEm).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Enviado</p>
                    <p className="text-base font-black" style={{ background: "linear-gradient(135deg, #ffba00, #ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      R$ {fmtBRL(h.totalEnviado)}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {h.transacoes.map((t, i) => (
                    <div key={`${t.id}-${i}`} className="flex items-center gap-2.5 py-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ background: t.tipo === "manual" ? "rgba(139,92,246,0.15)" : "rgba(255,186,0,0.1)", color: t.tipo === "manual" ? "#a78bfa" : "#ffba00" }}>{t.tipo}</span>
                      <span className="text-xs font-black text-white flex-1 truncate">{t.displayName}</span>
                      <span className="text-xs text-gray-500">R$ {fmtBRL(t.valor)}</span>
                      <PayBadge status={t.status} erro={t.erro} />
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
