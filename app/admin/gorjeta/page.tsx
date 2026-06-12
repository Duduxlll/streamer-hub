"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { CadastroGorjeta, SessaoGorjeta, ParticipanteSessao, TransacaoGorjeta, TipoChavePix } from "@/lib/gorjeta-store";
import { CrashGame } from "@/components/CrashGame";

function mascarChaveAdmin(_c: { cpf: string; tipoChave?: TipoChavePix }) { return `***.***.***-**`; }
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

function labelErro(erro?: string): string {
  if (!erro) return "falhou";
  const e = erro.toLowerCase();
  if (e.includes("chave_pix") || e.includes("chave pix") || e.includes("chave_invalida") ||
      (e.includes("chave") && (e.includes("inválid") || e.includes("invalid") || e.includes("não encontrad") || e.includes("nao encontrad"))) ||
      e.includes("favorecido") || e.includes("destinatário")) {
    return "chave PIX errada";
  }
  if (e.includes("saldo") && (e.includes("insuficiente") || e.includes("insufficient"))) return "saldo insuficiente";
  if (e.includes("limite") || e.includes("limit")) return "limite excedido";
  return "falhou";
}

function PayBadge({ status, erro }: { status: string; erro?: string }) {
  if (status === "enviado") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
      ✓ enviado
    </span>
  );
  if (status === "pendente") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color: "#ffba00", background: "rgba(255,186,0,0.1)", border: "1px solid rgba(255,186,0,0.3)" }}>
      • pendente
    </span>
  );
  const label = labelErro(erro);
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap" title={erro}
      style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
      ✕ {label}
    </span>
  );
}

function tipoTransacaoMeta(tipo: TransacaoGorjeta["tipo"]) {
  if (tipo === "manual") return { label: "Manual", bg: "rgba(139,92,246,0.15)", color: "#c4b5fd" };
  if (tipo === "automatico") return { label: "Automático", bg: "rgba(34,197,94,0.12)", color: "#4ade80" };
  return { label: "Sorteio", bg: "rgba(255,186,0,0.1)", color: "#ffba00" };
}

type HistoricoItem = { id: string; saldoTotal: number; totalEnviado: number; transacoes: TransacaoGorjeta[]; abertaEm: number; fechadaEm: number };

function HistoricoCard({ h, num }: { h: HistoricoItem; num: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,17,10,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button className="w-full px-5 py-4 flex items-center gap-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-left" onClick={() => setExpanded(e => !e)}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs text-black" style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>#{num}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white">Total enviado R$ {fmtBRL(h.totalEnviado)}</p>
          <p className="text-[10px] text-gray-600">{new Date(h.fechadaEm).toLocaleString("pt-BR")} · {h.transacoes.length} transaç{h.transacoes.length === 1 ? "ão" : "ões"}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Enviado</p>
            <p className="text-base font-black" style={{ background: "linear-gradient(135deg, #ffba00, #ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              R$ {fmtBRL(h.totalEnviado)}
            </p>
          </div>
          <span className="text-gray-600 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && h.transacoes.length > 0 && (
        <div className="overflow-y-auto px-5 py-3 space-y-2"
          style={{ maxHeight: 240, scrollbarWidth: "thin", scrollbarColor: "rgba(255,186,0,0.15) transparent" }}>
          {h.transacoes.map((t, i) => (
            <div key={`${t.id}-${i}`} className="flex items-center gap-2.5 py-1 border-b border-white/[0.03] last:border-0">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-black flex-shrink-0"
                style={{ background: tipoTransacaoMeta(t.tipo).bg, color: tipoTransacaoMeta(t.tipo).color }}>
                {tipoTransacaoMeta(t.tipo).label}
              </span>
              <span className="text-xs font-black text-white flex-1 truncate">{t.displayName}</span>
              <span className="text-xs text-gray-500 flex-shrink-0">R$ {fmtBRL(t.valor)}</span>
              <PayBadge status={t.status} erro={t.erro} />
            </div>
          ))}
        </div>
      )}
      {expanded && h.transacoes.length === 0 && (
        <p className="px-5 py-3 text-xs text-gray-600">Nenhuma transação registrada.</p>
      )}
    </div>
  );
}

function ScreenshotModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    fetch(`/api/gorjeta?screenshot=${id}`).then(r => r.json()).then(d => setSrc(d.screenshot ?? null)).catch(() => setSrc(null));
  }, [id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className={`relative w-full rounded-3xl overflow-hidden transition-all duration-300 ${zoomed ? "max-w-4xl" : "max-w-lg"}`}
        style={{ background: "rgba(6,17,10,0.98)", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 0 60px rgba(255,186,0,0.08)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <span className="text-sm font-black text-white">Comprovante de depósito</span>
          <div className="flex items-center gap-2">
            {src && (
              <button onClick={() => setZoomed(z => !z)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-[#ffba00] transition-colors hover:bg-white/5"
                title={zoomed ? "Reduzir" : "Ampliar"}>
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  {zoomed
                    ? <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                    : <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  }
                </svg>
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors hover:bg-white/5">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
          {src
            ? <img src={src} alt="comprovante"
                className="w-full rounded-2xl object-contain transition-all duration-300"
                style={{ maxHeight: zoomed ? "none" : "65vh", cursor: zoomed ? "zoom-out" : "zoom-in" }}
                onClick={() => setZoomed(z => !z)} />
            : <div className="h-40 flex items-center justify-center text-gray-600 text-sm">Carregando...</div>
          }
        </div>
      </div>
    </div>
  );
}



function SortearModal({ participantes, vencedores, autoDisponivel, onPagarAuto, onPagarFila, onClose }: {
  participantes: ParticipanteSessao[];
  vencedores: ParticipanteSessao[];
  autoDisponivel: boolean;
  onPagarAuto: () => Promise<boolean>;
  onPagarFila: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [spinDisplay, setSpinDisplay] = useState<ParticipanteSessao>(participantes[0] ?? vencedores[0]);
  const [revealedWinners, setRevealedWinners] = useState<ParticipanteSessao[]>([]);
  const [done, setDone] = useState(false);
  const [paying, setPaying] = useState<"auto" | "fila" | null>(null);
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
  }, []);

  const unrevealed = vencedores.length - revealedWinners.length;
  async function handlePay(modo: "auto" | "fila") {
    setPaying(modo);
    const ok = modo === "auto" ? await onPagarAuto() : await onPagarFila();
    if (!ok) setPaying(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "rgba(6,17,10,0.98)", border: "1px solid rgba(255,186,0,0.3)", boxShadow: "0 0 80px rgba(255,186,0,0.1)" }}>


        <div className="px-6 pt-6 pb-4 text-center border-b border-white/5">
          <div className="text-2xl mb-1">🎲</div>
          <h2 className="text-lg font-black text-white">
            {done ? "Vencedores sorteados!" : "Sorteando..."}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {done ? `${vencedores.length} vencedor${vencedores.length !== 1 ? "es" : ""}` : `Revelando ${unrevealed} vencedor${unrevealed !== 1 ? "es" : ""}...`}
          </p>
        </div>


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

            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#ffba00] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s`, opacity: 0.7 }} />
              ))}
            </div>
          </div>
        )}


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


        <div className="px-5 pb-6 space-y-2 border-t border-white/5 pt-4">
          {done && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                disabled={!!paying || !autoDisponivel}
                onClick={() => handlePay("auto")}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
                style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 4px 20px rgba(34,197,94,0.22)" }}>
                {!autoDisponivel ? "⚡ GGPix off" : paying === "auto" ? "..." : "⚡ PIX automático"}
              </button>
              <button
                disabled={!!paying}
                onClick={() => handlePay("fila")}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100"
                style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.3)" }}>
                {paying === "fila" ? "..." : "💳 Pagamento manual"}
              </button>
            </div>
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



function ConfirmModal({ title, desc, icon, confirmLabel = "Confirmar", onConfirm, onClose }: {
  title: string; desc: string; icon: string; confirmLabel?: string;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-xs rounded-3xl overflow-hidden"
        style={{
          background: "rgba(6,17,10,0.99)",
          border: "1px solid rgba(248,113,113,0.25)",
          boxShadow: "0 0 80px rgba(248,113,113,0.1), 0 24px 60px rgba(0,0,0,0.7)",
          animation: "fadeInUp 0.25s ease-out",
        }}
        onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl mb-4 text-2xl"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
            {icon}
          </div>
          <h3 className="text-base font-black text-white mb-2">{title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
        </div>
        <div className="px-5 pb-6 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl text-xs font-black transition-all hover:bg-white/[0.04]"
            style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
            Cancelar
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-2xl text-xs font-black text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.55), rgba(220,38,38,0.4))",
              border: "1px solid rgba(248,113,113,0.35)",
              boxShadow: "0 4px 20px rgba(239,68,68,0.2)",
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}



function CadastroCard({ c, onAprovar, onRejeitar, onVerFoto, onChaveEditada, onDeletar }: {
  c: CadastroGorjeta;
  onAprovar: () => void;
  onRejeitar: (motivo: string) => void;
  onVerFoto: () => void;
  onChaveEditada: () => void;
  onDeletar: () => void;
}) {
  const [rejMotivo, setRejMotivo] = useState("");
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [chaveEdit, setChaveEdit] = useState("");
  const [busy, setBusy] = useState(false);
  const [editErr, setEditErr] = useState("");

  const borderColor = c.status === "aprovado" ? "rgba(74,222,128,0.2)" : c.status === "rejeitado" ? "rgba(248,113,113,0.15)" : "rgba(255,186,0,0.15)";

  async function salvarChave() {
    setBusy(true);
    setEditErr("");
    try {
      const res = await fetch("/api/gorjeta", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editar-chave", id: c.id, tipoChave: "cpf", chave: chaveEdit }),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error ?? "Erro"); return; }
      onChaveEditada(); setShowEdit(false);
    } catch { setEditErr("Erro de conexão"); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: "rgba(6,17,10,0.9)", border: `1px solid ${borderColor}` }}>
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
          <button onClick={() => { setChaveEdit(c.cpf); setEditErr(""); setShowEdit(s => !s); setShowRejeitar(false); }}
            className="px-2.5 py-1.5 rounded-xl text-[11px] transition-all hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: showEdit ? "#ffba00" : "#6b7280" }}>✏️</button>
          <button onClick={onDeletar} className="px-2.5 py-1.5 rounded-xl text-[11px] font-black text-gray-500 hover:text-red-400 transition-all hover:bg-red-500/5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>🗑️</button>
        </div>
      </div>
      <div className="px-5 pb-3 grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
        <div><p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Nome</p><p className="text-xs font-bold text-white truncate">{c.nomeCompleto}</p></div>
        <div>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">CPF</p>
          <p className="text-xs font-bold text-white">{mascarChaveAdmin(c)}</p>
        </div>
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
          <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest">Editar CPF</p>
          <div className="flex gap-2">
            <input type="text" inputMode="numeric" placeholder="000.000.000-00"
              value={formatCpfInput(chaveEdit)}
              onChange={e => { setChaveEdit(e.target.value); setEditErr(""); }}
              className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-gray-600 outline-none"
              style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.3)" }} />
            <button disabled={busy} onClick={salvarChave}
              className="px-4 py-2 rounded-xl text-xs font-black text-black disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
              {busy ? "..." : "Salvar"}
            </button>
            <button onClick={() => { setShowEdit(false); setEditErr(""); }}
              className="px-3 py-2 rounded-xl text-xs font-black text-gray-500 hover:text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>✕</button>
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



export default function AdminGorjetaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = (searchParams.get("tab") as "sessao" | "cadastros" | "historico") ?? "sessao";
  const [cadastroFiltro, setCadastroFiltro] = useState<"pendente" | "aprovado" | "rejeitado">("pendente");
  const [sessaoTab, setSessaoTab] = useState<"sortear" | "manual" | "crash" | "corrida">("sortear");
  const [corridaNum, setCorridaNum] = useState("");
  const corridaSessaoIdRef = useRef<string | null>(null);

  const [crashSel, setCrashSel] = useState<ParticipanteSessao | null>(null);
  const [crashBuscaSel, setCrashBuscaSel] = useState("");
  const [crashGame, setCrashGame] = useState<{ participante: ParticipanteSessao } | null>(null);
  const [ggpixOk, setGgpixOk] = useState(false);
  const [cadastros, setCadastros] = useState<CadastroGorjeta[]>([]);
  const [sessao, setSessao] = useState<SessaoGorjeta | null>(null);
  const [historico, setHistorico] = useState<Array<{ id: string; saldoTotal: number; totalEnviado: number; transacoes: TransacaoGorjeta[]; abertaEm: number; fechadaEm: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [formSort, setFormSort] = useState({ valor: "10", qtd: "3" });
  const [busca, setBusca] = useState("");
  const [buscaCadastro, setBuscaCadastro] = useState("");
  const [manualSel, setManualSel] = useState<ParticipanteSessao | null>(null);
  const [manualValor, setManualValor] = useState("");
  async function verFotoNova(id: string) {
    const res = await fetch(`/api/gorjeta?screenshot=${id}`);
    const { screenshot } = await res.json();
    if (!screenshot) return;
    const blob = await fetch(screenshot).then(r => r.blob());
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
  const [showSortearModal, setShowSortearModal] = useState(false);
  const [sortearVencedores, setSortearVencedores] = useState<ParticipanteSessao[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; desc: string; icon: string; confirmLabel?: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  const fetchAll = useCallback(async () => {
    const [gRes, cRes] = await Promise.all([
      fetch("/api/gorjeta"),
      fetch("/api/gorjeta?tipo=cadastros"),
    ]);
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

  useEffect(() => {
    if (!sessao) {
      corridaSessaoIdRef.current = null;
      return;
    }
    const topSessao = sessao.maxVencedores > 0 ? sessao.maxVencedores : 5;
    const top = Math.max(1, topSessao);
    if (corridaSessaoIdRef.current !== sessao.id || corridaNum.trim() === "") {
      corridaSessaoIdRef.current = sessao.id;
      setCorridaNum(String(top));
    }
  }, [sessao, corridaNum]);


  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/config").then(r => r.ok ? r.json() : null).then(d => setGgpixOk(!!d?.ggpix?.ok)).catch(() => {});
  }, [status]);

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

  async function onChaveEditada() { await fetchAll(); flash("Chave PIX atualizada!", "ok"); }
  function deletar(id: string) {
    setConfirmModal({
      title: "Apagar cadastro?",
      desc: "A pessoa será removida e poderá se recadastrar normalmente.",
      icon: "🗑️",
      confirmLabel: "Apagar",
      onConfirm: () => { apiCall({ action: "deletar-cadastro", id }).then(r => { if (r) flash("Cadastro apagado", "ok"); }); },
    });
  }
  function limparHistoricoAction() {
    setConfirmModal({
      title: "Limpar histórico?",
      desc: "Todas as sessões encerradas serão removidas permanentemente.",
      icon: "📜",
      confirmLabel: "Limpar tudo",
      onConfirm: () => { apiCall({ action: "limpar-historico" }).then(r => { if (r) flash("Histórico limpo", "ok"); }); },
    });
  }
  function limparInscritosAction() {
    if (!sessao || sessao.participantes.length === 0) return;
    setConfirmModal({
      title: "Limpar inscritos?",
      desc: "A lista atual será zerada e o chat poderá entrar de novo com !gorjeta.",
      icon: "🧹",
      confirmLabel: "Limpar inscritos",
      onConfirm: () => {
        apiCall({ action: "limpar-inscritos" }).then(r => {
          if (r) {
            setSortearVencedores([]);
            setManualSel(null);
            setCrashSel(null);
            setCrashGame(null);
            flash("Inscritos limpos", "ok");
          }
        });
      },
    });
  }
  async function aprovar(id: string) { const r = await apiCall({ action: "aprovar", id }); if (r) flash("Aprovado!", "ok"); }
  async function rejeitar(id: string, motivo: string) { const r = await apiCall({ action: "rejeitar", id, motivo }); if (r) flash("Rejeitado", "ok"); }

  async function abrirSessao() {
    const r = await apiCall({ action: "abrir-sessao" });
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

  async function pagarAutomaticoSorteio(): Promise<boolean> {
    const r = await apiCall({ action: "pagar" });
    if (!r) return false;
    const pagamentos = Array.isArray(r.pagamentos) ? r.pagamentos : [];
    const falhas = pagamentos.filter((p: { status?: string }) => p.status === "falhou");
    setShowSortearModal(false);
    if (falhas.length > 0) {
      flash(`${falhas.length} PIX falhou. Confira o histórico e tente manual se precisar.`, "err");
    } else {
      flash("PIX automático enviado pelo GGPix! ⚡", "ok");
    }
    return true;
  }

  async function pagarFila(): Promise<boolean> {
    const r = await apiCall({ action: "pagar-fila" });
    if (r) {
      setShowSortearModal(false);
      flash("Pagamento manual criado como pendente.", "ok");
      return true;
    }
    return false;
  }

  async function enviarManualAutomatico() {
    if (!manualSel) return;
    const valor = parseFloat(manualValor.replace(",", "."));
    if (isNaN(valor) || valor <= 0) { flash("Valor inválido", "err"); return; }
    const r = await apiCall({ action: "enviar-manual", username: manualSel.username, valor });
    if (!r) return;
    if (r.result?.status === "falhou") {
      flash(`Falha no PIX: ${r.result.erro ?? ""}`, "err");
      return;
    }
    flash("PIX automático enviado! ⚡", "ok");
    setManualSel(null);
    setManualValor("");
  }

  async function enviarManualFila() {
    if (!manualSel) return;
    const valor = parseFloat(manualValor.replace(",", "."));
    if (isNaN(valor) || valor <= 0) { flash("Valor inválido", "err"); return; }
    const r = await apiCall({ action: "enviar-manual-fila", username: manualSel.username, valor });
    if (r) {
      flash("Pagamento manual criado como pendente.", "ok");
      setManualSel(null);
      setManualValor("");
    }
  }

  function iniciarCrash() {
    if (!crashSel) { flash("Selecione um participante", "err"); return; }
    setCrashGame({ participante: crashSel });
  }

  async function crashEnviar(valor: number, modo: "auto" | "fila"): Promise<boolean> {
    if (!crashGame) return false;
    if (modo === "auto") {
      const r = await apiCall({ action: "enviar-manual", username: crashGame.participante.username, valor });
      if (!r) return false;
      if (r.result?.status === "falhou") { flash(`Falha no PIX: ${r.result.erro ?? ""}`, "err"); return false; }
      flash("PIX enviado! ⚡", "ok"); return true;
    }
    const r = await apiCall({ action: "enviar-manual-fila", username: crashGame.participante.username, valor });
    if (r) { flash("Pagamento manual criado como pendente.", "ok"); return true; }
    return false;
  }

  function iniciarCorrida() {
    if (!sessao || sessao.participantes.length === 0) { flash("Sem inscritos na sessão", "err"); return; }
    const nVenc = Math.max(1, parseInt(corridaNum) || sessao.maxVencedores || 1);
    localStorage.setItem("corrida-race-data", JSON.stringify({
      participants: sessao.participantes.map(p => ({ username: p.username, displayName: p.displayName, image: p.image })),
      numVencedores: nVenc,
      topN: nVenc,
      top: nVenc,
      maxVencedores: nVenc,
    }));
    const corridaUrl = `/admin/corrida?top=${nVenc}`;
    router.push(corridaUrl);
  }

  async function fecharSessao() { const r = await apiCall({ action: "fechar-sessao" }); if (r) flash("Gorjeta encerrada", "ok"); }
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

  const totalEnviadoSessao = sessao?.transacoes.filter(t => t.status === "enviado").reduce((s, t) => s + t.valor, 0) ?? 0;
  const totalPendenteSessao = sessao?.transacoes.filter(t => t.status === "pendente").reduce((s, t) => s + t.valor, 0) ?? 0;
  const totalRegistradoSessao = totalEnviadoSessao + totalPendenteSessao;
  const pctEnviadoSessao = totalRegistradoSessao > 0 ? Math.min(100, (totalEnviadoSessao / totalRegistradoSessao) * 100) : 0;

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(ellipse, #ffba00, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
      {showSortearModal && sessao && (
        <SortearModal
          participantes={sessao.participantes}
          vencedores={sortearVencedores}
          autoDisponivel={ggpixOk}
          onPagarAuto={pagarAutomaticoSorteio}
          onPagarFila={pagarFila}
          onClose={() => setShowSortearModal(false)} />
      )}
      {crashGame && sessao && (
        <CrashGame
          participante={crashGame.participante}
          autoDisponivel={ggpixOk}
          onEnviar={crashEnviar}
          onClose={() => setCrashGame(null)} />
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


        {tab === "sessao" && (
          <div className="space-y-4">
            {!sessao || sessao.status === "fechada" ? (

              <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,17,10,0.9)", border: "1px solid rgba(255,186,0,0.15)", boxShadow: "0 0 40px rgba(255,186,0,0.04)" }}>
                <div className="px-6 py-5 border-b border-white/5">
                  <p className="text-[10px] font-black text-[#ffba00] uppercase tracking-widest mb-1">Nova sessão</p>
                  <h2 className="text-lg font-black text-white">Abrir gorjeta</h2>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="rounded-2xl px-4 py-4 space-y-3" style={{ background: "rgba(255,186,0,0.05)", border: "1px solid rgba(255,186,0,0.14)" }}>
                    <p className="text-sm font-black text-white">Como funciona</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Abra a gorjeta para liberar os inscritos. O pessoal entra pelo chat digitando !gorjeta; depois você escolhe Sorteio, Manual, Crash ou Corrida. No Pix automático o valor é enviado direto para a chave cadastrada, e no pagamento manual ele fica pendente até você conferir e marcar como pago.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {["Chat usa !gorjeta", "Pix automático envia direto", "Manual fica pendente"].map(item => (
                        <div key={item} className="px-3 py-2 rounded-xl text-[11px] font-black text-[#ffba00]" style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          {item}
                        </div>
                      ))}
                    </div>
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

                <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,17,10,0.95)", border: "1px solid rgba(255,186,0,0.25)", boxShadow: "0 0 50px rgba(255,186,0,0.06)" }}>
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


                  <div className="px-6 py-5 space-y-3">
                    <div className="flex items-end justify-between mb-1">
                      <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Total enviado</p>
                        <p className="text-3xl font-black" style={{ background: "linear-gradient(135deg, #ffba00, #ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          R$ {fmtBRL(totalEnviadoSessao)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Pendente manual</p>
                        <p className="text-sm font-black text-gray-500">R$ {fmtBRL(totalPendenteSessao)}</p>
                      </div>
                    </div>

                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pctEnviadoSessao}%`, background: "linear-gradient(90deg, #4ade80, #ffba00)" }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-600">
                      <span>{sessao.participantes.length} inscritos</span>
                      <span>{sessao.transacoes.filter(t => t.status === "enviado").length} pagamentos enviados</span>
                    </div>
                  </div>
                </div>


                {sessao.participantes.length > 0 && (
                  <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,17,10,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex-1 min-w-0">Inscritos</p>
                      <button onClick={limparInscritosAction} disabled={busy}
                        className="px-3 py-1.5 rounded-full text-[10px] font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/10 shrink-0 whitespace-nowrap"
                        style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }}>
                        Limpar inscritos
                      </button>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)" }}>{sessao.participantes.length}</span>
                    </div>
                    <div className="p-4 overflow-y-auto" style={{ maxHeight: 260, scrollbarWidth: "thin", scrollbarColor: "rgba(255,186,0,0.2) transparent" }}>
                      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))" }}>
                        {sessao.participantes.map(p => (
                          <div key={p.username} className="relative overflow-hidden rounded-2xl flex flex-col items-center"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
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


                <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,17,10,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>

                  <div className="flex border-b border-white/5">
                    {(["sortear", "manual", "crash", "corrida"] as const).map(t => (
                      <button key={t} onClick={() => setSessaoTab(t)}
                        className="flex-1 py-3.5 text-[11px] sm:text-xs font-black transition-all"
                        style={sessaoTab === t
                          ? { color: "#ffba00", borderBottom: "2px solid #ffba00" }
                          : { color: "#4b5563", borderBottom: "2px solid transparent" }}>
                        {t === "sortear" ? "🎲 Sortear" : t === "manual" ? "✍️ Manual" : t === "crash" ? "🚀 Crash" : "🏁 Corrida"}
                      </button>
                    ))}
                  </div>


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
                            <span className="text-xs text-gray-500">Total previsto</span>
                            <span className="text-sm font-black text-[#ffba00]">
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
                          <div className="px-4 py-3 space-y-2">
                            <div className="flex gap-2 items-center">
                              <span className="text-sm font-black text-[#ffba00]">R$</span>
                              <input type="text" inputMode="decimal" placeholder="0,00" value={manualValor}
                                onChange={e => setManualValor(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-white placeholder-gray-600 outline-none"
                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,186,0,0.25)" }} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button onClick={enviarManualAutomatico} disabled={busy || !manualValor || !ggpixOk}
                                className="w-full py-2 rounded-xl text-xs font-black disabled:opacity-50 transition-all hover:scale-[1.02]"
                                style={ggpixOk
                                  ? { background: "linear-gradient(135deg, #4ade80, #22c55e)", color: "#000" }
                                  : { background: "rgba(255,255,255,0.03)", color: "#4b5563", border: "1px solid rgba(255,255,255,0.07)" }}>
                                {!ggpixOk ? "⚡ GGPix off" : busy ? "..." : "⚡ PIX automático"}
                              </button>
                              <button onClick={enviarManualFila} disabled={busy || !manualValor}
                                className="w-full py-2 rounded-xl text-xs font-black text-black disabled:opacity-50 transition-all hover:scale-[1.02]"
                                style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                                {busy ? "..." : "💳 Pagamento manual"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {sessaoTab === "crash" && (
                    <div className="px-5 py-5 space-y-3">
                      <div className="rounded-xl px-3 py-2.5 text-[11px] text-gray-500 leading-relaxed"
                        style={{ background: "rgba(255,186,0,0.04)", border: "1px solid rgba(255,186,0,0.1)" }}>
                        🚀 O Crash começa em R$ 0 e pode parar em 0x ou subir até <strong className="text-[#ffba00]">10x</strong>. Cada 1x vale R$ 10; quanto mais alto, mais raro.
                      </div>

                      <input type="text" placeholder="Buscar participante..." value={crashBuscaSel}
                        onChange={e => setCrashBuscaSel(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />

                      {sessao.participantes.length === 0 && (
                        <div className="text-center py-8 text-gray-600 text-sm">Nenhum inscrito ainda</div>
                      )}

                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {sessao.participantes
                          .filter(p => !crashBuscaSel || p.displayName.toLowerCase().includes(crashBuscaSel.toLowerCase()) || p.username.toLowerCase().includes(crashBuscaSel.toLowerCase()))
                          .map(p => {
                            const isSel = crashSel?.username === p.username;
                            return (
                              <button key={p.username} onClick={() => { setCrashSel(isSel ? null : p); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                                style={isSel
                                  ? { background: "rgba(255,186,0,0.1)", border: "1px solid rgba(255,186,0,0.3)" }
                                  : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <Avatar image={p.image} name={p.displayName} size={32} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-white truncate">{p.displayName}</p>
                                  <p className="text-[10px] text-gray-600">@{p.username}</p>
                                </div>
                                {isSel && <span className="text-[#ffba00] text-sm">✓</span>}
                              </button>
                            );
                          })}
                      </div>

                      {crashSel && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)" }}>
                          <div className="px-4 py-3 flex items-center gap-3 border-b border-[#ffba00]/10">
                            <Avatar image={crashSel.image} name={crashSel.displayName} size={28} />
                            <p className="text-xs font-black text-white flex-1">{crashSel.displayName}</p>
                            <button onClick={() => setCrashSel(null)} className="text-gray-600 hover:text-gray-400 text-sm">✕</button>
                          </div>
                          <div className="px-4 py-3 space-y-2.5">
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Valor por x</p>
                                  <p className="text-sm font-black text-[#ffba00]">R$ 10</p>
                                </div>
                                <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Máximo</p>
                                  <p className="text-sm font-black text-[#ffba00]">10x</p>
                                </div>
                                <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Prêmio</p>
                                  <p className="text-sm font-black text-[#ffba00]">R$ 100</p>
                                </div>
                              </div>
                            </div>
                            <button onClick={iniciarCrash} disabled={busy}
                              className="w-full py-2.5 rounded-xl text-xs font-black text-black disabled:opacity-50 transition-all hover:scale-[1.02]"
                              style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}>
                              🚀 Iniciar Crash
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                  {sessaoTab === "corrida" && (
                    <div className="px-5 py-5 space-y-3">
                      <div className="rounded-xl px-3 py-2.5 text-[11px] text-gray-500 leading-relaxed"
                        style={{ background: "rgba(255,186,0,0.04)", border: "1px solid rgba(255,186,0,0.1)" }}>
                        🏁 Os <strong className="text-[#ffba00]">{sessao.participantes.length}</strong> inscritos viram bolinhas numa corrida 3D. Abre em tela cheia (ótimo pra mostrar na live). Os primeiros a chegar ganham!
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Quantos ganham (top N)</label>
                        <input type="number" min="1" value={corridaNum}
                          onChange={e => setCorridaNum(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                        <p className="text-[10px] text-gray-600 mt-1">Você define os valores no final, antes de pagar.</p>
                      </div>
                      <button onClick={iniciarCorrida} disabled={sessao.participantes.length === 0}
                        className="w-full py-3 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.2)" }}>
                        {sessao.participantes.length === 0 ? "Aguardando inscritos..." : "🏁 Abrir corrida 3D"}
                      </button>
                    </div>
                  )}
                </div>


                {sessao.transacoes.length > 0 && (
                  <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(6,17,10,0.8)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-5 py-3 border-b border-white/5">Pagamentos nesta sessão</p>
                    <div className="px-5 py-3 space-y-2 max-h-48 overflow-y-auto">
                      {[...sessao.transacoes].reverse().map(t => (
                        <div key={t.id} className="flex items-center gap-2.5 py-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ background: tipoTransacaoMeta(t.tipo).bg, color: tipoTransacaoMeta(t.tipo).color }}>{tipoTransacaoMeta(t.tipo).label}</span>
                          <span className="text-xs font-bold text-white flex-1 truncate">{t.displayName}</span>
                          <span className="text-xs font-black text-white">R$ {fmtBRL(t.valor)}</span>
                          <PayBadge status={t.status} erro={t.erro} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                <div className="flex gap-2 flex-wrap">
                  <button onClick={fecharSessao} disabled={busy}
                    className="w-full py-3 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                    Fechar gorjeta
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {tab === "cadastros" && (
          <div className="space-y-4">

            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar por nome ou usuário..."
                value={buscaCadastro}
                onChange={e => setBuscaCadastro(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${buscaCadastro ? "rgba(255,186,0,0.35)" : "rgba(255,255,255,0.08)"}` }}
              />
              {buscaCadastro && (
                <button onClick={() => setBuscaCadastro("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors text-sm">
                  ✕
                </button>
              )}
            </div>


            {!buscaCadastro && (
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
            )}

            {(() => {
              const q = buscaCadastro.trim().toLowerCase();
              const lista = q
                ? cadastros.filter(c =>
                    c.displayName.toLowerCase().includes(q) ||
                    c.username.toLowerCase().includes(q) ||
                    c.nomeCompleto.toLowerCase().includes(q)
                  )
                : cadastroFiltro === "pendente" ? pendentes
                : cadastroFiltro === "aprovado" ? aprovados
                : rejeitados;

              if (lista.length === 0) return (
                <div className="text-center py-16">
                  <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-3xl">{q ? "🔍" : "📋"}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600">
                    {q ? `Nenhum cadastro encontrado para "${buscaCadastro}"` : `Nenhum cadastro ${cadastroFiltro === "pendente" ? "pendente" : cadastroFiltro === "aprovado" ? "aprovado" : "rejeitado"}`}
                  </p>
                </div>
              );

              return (
                <>
                  {q && (
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">
                      {lista.length} resultado{lista.length !== 1 ? "s" : ""} encontrado{lista.length !== 1 ? "s" : ""}
                    </p>
                  )}
                  <div className="space-y-3">
                    {lista.map(c => (
                      <CadastroCard key={c.id} c={c}
                        onAprovar={() => aprovar(c.id)}
                        onRejeitar={(motivo) => rejeitar(c.id, motivo)}
                        onVerFoto={() => verFotoNova(c.id)}
                        onChaveEditada={onChaveEditada}
                        onDeletar={() => deletar(c.id)} />
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}


        {tab === "historico" && (
          <div className="space-y-4">
            {historico.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-3xl">📜</span>
                </div>
                <p className="text-sm font-bold text-gray-600">Nenhuma gorjeta encerrada ainda</p>
              </div>
            )}
            {historico.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    {historico.length} sessão{historico.length !== 1 ? "ões" : ""} encerrada{historico.length !== 1 ? "s" : ""}
                  </p>
                  <button onClick={limparHistoricoAction} disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:text-red-400 disabled:opacity-50"
                    style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
                    🗑️ Limpar histórico
                  </button>
                </div>
                <div className="overflow-y-auto space-y-3 pr-1"
                  style={{ maxHeight: "calc(100vh - 310px)", scrollbarWidth: "thin", scrollbarColor: "rgba(255,186,0,0.2) transparent" }}>
                  {historico.map((h, idx) => (
                    <HistoricoCard key={h.id} h={h} num={historico.length - idx} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
