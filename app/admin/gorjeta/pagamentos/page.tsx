"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import QRCode from "qrcode";
import type { PagamentoPendente } from "@/lib/gorjeta-store";
import { generatePixPayload } from "@/lib/pix-payload";

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function tipoPagamentoMeta(tipo: PagamentoPendente["tipo"]) {
  if (tipo === "sorteio") return { label: "Manual", bg: "rgba(255,186,0,0.1)", color: "#ffba00" };
  return { label: "Manual", bg: "rgba(139,92,246,0.15)", color: "#c4b5fd" };
}

function StatusBadge({ status }: { status: PagamentoPendente["status"] }) {
  const map = {
    pendente: { label: "Pendente", color: "#ffba00", bg: "rgba(255,186,0,0.12)",  border: "rgba(255,186,0,0.3)"  },
    enviado:  { label: "Pago",     color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.3)" },
    falhou:   { label: "Falhou",   color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}



function QrCodeModal({ pagamento, onMarcarPago, onClose, busy }: {
  pagamento: PagamentoPendente;
  onMarcarPago: () => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [qrUrl, setQrUrl]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);


  const payload = generatePixPayload({
    pixKey:       pagamento.pixKey,
    amount:       pagamento.valor,
    merchantName: pagamento.displayName,
    txId:         pagamento.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "GORJETA",
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: "M" })
      .then(setQrUrl)
      .catch(() => setErro("Não foi possível gerar o QR Code — verifique se a chave PIX é válida."));
  }, [payload]);

  async function copiarChave() {
    await navigator.clipboard.writeText(pagamento.pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function copiarPayload() {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden"
      style={{ animation: "pixFadeIn 0.2s ease-out" }}
      onClick={onClose}>
      <style>{`
        @keyframes pixFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pixModalIn { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pixQrIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes pixValuePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
      `}</style>

      <div
        className="w-full max-w-xs rounded-3xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: "calc(100dvh - 24px)",
          background: "rgba(6,15,9,0.99)",
          border: "1px solid rgba(255,186,0,0.25)",
          boxShadow: "0 20px 70px rgba(0,0,0,0.75), 0 0 60px rgba(255,186,0,0.08)",
          animation: "pixModalIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>


        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(255,186,0,0.1), rgba(255,140,0,0.03))",
            borderBottom: "1px solid rgba(255,186,0,0.12)",
          }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: "rgba(255,186,0,0.15)", border: "1px solid rgba(255,186,0,0.3)" }}>
              💸
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white leading-tight">Pagar com PIX</p>
              <p className="text-[11px] text-gray-500 truncate">{pagamento.displayName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all flex-shrink-0">
            ✕
          </button>
        </div>


        <div className="px-4 py-2.5 flex flex-col items-center gap-1.5">


          <div className="text-center">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Valor a pagar</p>
            <p className="text-2xl font-black" style={{ color: "#ffba00", animation: "pixValuePulse 2.5s ease-in-out infinite" }}>
              R$ {fmtBRL(pagamento.valor)}
            </p>
          </div>


          {erro ? (
            <div className="w-[180px] h-[180px] flex items-center justify-center text-center px-6 rounded-2xl"
              style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <p className="text-xs text-red-400">{erro}</p>
            </div>
          ) : qrUrl ? (
            <div className="rounded-2xl overflow-hidden bg-white p-2.5"
              style={{ animation: "pixQrIn 0.4s ease-out", boxShadow: "0 0 30px rgba(255,186,0,0.12)" }}>
              <img src={qrUrl} alt="QR Code PIX" className="w-[158px] h-[158px] block" />
            </div>
          ) : (
            <div className="w-[180px] h-[180px] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
            </div>
          )}

          <p className="text-[11px] text-gray-600 text-center px-2 leading-relaxed">
            Escaneie com o app do seu banco ou use as opções abaixo
          </p>


          <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Chave PIX</p>
              <p className="text-sm font-black text-gray-400 tracking-widest leading-none">••••••••••</p>
            </div>
            <button onClick={copiarChave}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-[1.03] active:scale-95"
              style={copiedKey
                ? { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
                : { background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
              {copiedKey ? "✓ Copiado" : "📋 Copiar"}
            </button>
          </div>


          <button onClick={copiarPayload}
            className="w-full py-2.5 rounded-xl text-xs font-black transition-all hover:scale-[1.01] active:scale-95"
            style={copied
              ? { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
              : { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
            {copied ? "✓ Código copiado!" : "📋 Copiar código PIX (copia e cola)"}
          </button>
        </div>


        <div className="px-4 pb-3 pt-2 space-y-1.5 flex-shrink-0 border-t border-white/5">
          <button
            disabled={busy}
            onClick={onMarcarPago}
            className="w-full py-3 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100"
            style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 4px 20px rgba(74,222,128,0.2)" }}>
            {busy ? "..." : "✓ Marcar como pago"}
          </button>
          <button onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-black transition-all hover:bg-white/5"
            style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.06)" }}>
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}



function PagamentoCard({ p, onEnviar, onRemover, busy }: {
  p: PagamentoPendente;
  onEnviar: () => void;
  onRemover: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: p.status === "enviado" ? "rgba(5,20,5,0.7)" : p.status === "falhou" ? "rgba(20,5,5,0.7)" : "rgba(6,15,9,0.92)",
        border: p.status === "enviado" ? "1px solid rgba(74,222,128,0.18)" : p.status === "falhou" ? "1px solid rgba(248,113,113,0.18)" : "1px solid rgba(255,186,0,0.15)",
        backdropFilter: "blur(20px)",
      }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-black text-white">{p.displayName}</span>
            <StatusBadge status={p.status} />
            <span className="text-[10px] px-1.5 py-0.5 rounded font-black"
              style={{ background: tipoPagamentoMeta(p.tipo).bg, color: tipoPagamentoMeta(p.tipo).color }}>
              {tipoPagamentoMeta(p.tipo).label}
            </span>
          </div>
          <p className="text-[11px] text-gray-600">@{p.username} · {fmtDate(p.criadoEm)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-black text-white">R$ {fmtBRL(p.valor)}</p>
          <p className="text-[10px] text-gray-600">{p.tipoChave.toUpperCase()}</p>
        </div>
      </div>

      {p.status !== "enviado" && (
        <div className="px-4 pb-3 flex gap-2 border-t border-white/[0.04] pt-3">
          <button
            disabled={busy}
            onClick={onEnviar}
            className="flex-1 py-2 rounded-lg text-xs font-black text-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
            {busy ? "..." : "💳 Abrir PIX manual"}
          </button>
          <button
            disabled={busy}
            onClick={onRemover}
            className="px-3 py-2 rounded-lg text-xs font-black transition-all hover:bg-red-500/10 disabled:opacity-50"
            style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            🗑
          </button>
        </div>
      )}

      {p.status === "enviado" && (
        <div className="px-4 pb-3 flex justify-end border-t border-white/[0.04] pt-3">
          <button
            disabled={busy}
            onClick={onRemover}
            className="px-3 py-1.5 rounded-lg text-[11px] font-black transition-all hover:bg-red-500/10 disabled:opacity-50"
            style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
            Remover do histórico
          </button>
        </div>
      )}
    </div>
  );
}



export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<PagamentoPendente[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [busyId,     setBusyId]     = useState<string | null>(null);
  const [msg,        setMsg]         = useState<{ text: string; ok: boolean } | null>(null);
  const [limpando,   setLimpando]   = useState(false);
  const [qrModal,    setQrModal]     = useState<PagamentoPendente | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/gorjeta?tipo=pagamentos");
    if (res.ok) { const d = await res.json(); setPagamentos(d.pagamentos ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function apiCall(action: string, id?: string) {
    const res = await fetch("/api/gorjeta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    return res.json();
  }

  async function marcarPago(id: string) {
    setBusyId(id);
    try {
      await apiCall("fila-marcar-pago", id);
      flash("Marcado como pago! ✓", true);
      setQrModal(null);
      await fetchAll();
    } finally { setBusyId(null); }
  }

  async function remover(id: string) {
    setBusyId(id);
    try {
      await apiCall("fila-remover", id);
      await fetchAll();
    } finally { setBusyId(null); }
  }

  async function limpar() {
    setLimpando(true);
    try {
      await apiCall("fila-limpar");
      flash("Finalizados removidos.", true);
      await fetchAll();
    } finally { setLimpando(false); }
  }

  const pendentes = pagamentos.filter(p => p.status === "pendente");
  const enviados  = pagamentos.filter(p => p.status === "enviado");
  const falhos    = pagamentos.filter(p => p.status === "falhou");

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-5">
      {qrModal && (
        <QrCodeModal
          pagamento={qrModal}
          busy={busyId === qrModal.id}
          onMarcarPago={() => marcarPago(qrModal.id)}
          onClose={() => setQrModal(null)} />
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">Pagamentos</h1>
          <p className="text-sm text-gray-600 mt-1">
            {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""} · {enviados.length} pago{enviados.length !== 1 ? "s" : ""}
          </p>
        </div>
        {(enviados.length > 0 || falhos.length > 0) && (
          <button disabled={limpando} onClick={limpar}
            className="text-[11px] font-black px-3 py-1.5 rounded-xl transition-all hover:bg-red-500/10 disabled:opacity-50"
            style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}>
            {limpando ? "..." : "🗑 Limpar finalizados"}
          </button>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-black ${msg.ok ? "text-green-400" : "text-red-400"}`}
          style={msg.ok
            ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }
            : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          {msg.ok ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && pagamentos.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: "rgba(6,15,9,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-3xl mb-3">💳</p>
          <p className="text-sm font-black text-white mb-1">Nenhum pagamento na fila</p>
          <p className="text-xs text-gray-600">Pagamentos aparecem aqui quando você escolhe Pagamento manual no sorteio, Crash, corrida ou envio manual.</p>
        </div>
      )}

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Pendentes ({pendentes.length})</p>
          {pendentes.map(p => (
            <PagamentoCard key={p.id} p={p} busy={busyId === p.id}
              onEnviar={() => setQrModal(p)}
              onRemover={() => remover(p.id)} />
          ))}
        </div>
      )}

      {falhos.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Com falha ({falhos.length})</p>
          {falhos.map(p => (
            <PagamentoCard key={p.id} p={p} busy={busyId === p.id}
              onEnviar={() => setQrModal(p)}
              onRemover={() => remover(p.id)} />
          ))}
        </div>
      )}

      {enviados.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setHistoricoAberto(v => !v)}
            className="w-full px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all hover:bg-white/[0.03]"
            style={{ background: "rgba(6,15,9,0.72)", border: "1px solid rgba(74,222,128,0.14)" }}>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Histórico de pagamentos</p>
              <p className="text-sm font-black text-white mt-0.5">
                {enviados.length} pago{enviados.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-black text-gray-500">
                {historicoAberto ? "Esconder" : "Ver pagamentos"}
              </span>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition-transform duration-200 ${historicoAberto ? "rotate-180" : ""}`}
                aria-hidden="true" />
            </div>
          </button>

          {historicoAberto && (
            <div className="space-y-3">
              {enviados.map(p => (
                <PagamentoCard key={p.id} p={p} busy={busyId === p.id}
                  onEnviar={() => setQrModal(p)}
                  onRemover={() => remover(p.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
