"use client";

import { useState, useEffect, useCallback } from "react";
import type { PagamentoPendente } from "@/lib/gorjeta-store";

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: PagamentoPendente["status"] }) {
  const map = {
    pendente: { label: "Pendente", color: "#ffba00", bg: "rgba(255,186,0,0.12)",  border: "rgba(255,186,0,0.3)"  },
    enviado:  { label: "Enviado",  color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.3)" },
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

function PagamentoCard({ p, ggpixOk, onEnviar, onMarcarPago, onRemover, busy }: {
  p: PagamentoPendente;
  ggpixOk: boolean;
  onEnviar: () => Promise<void>;
  onMarcarPago: () => Promise<void>;
  onRemover: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: p.status === "enviado" ? "rgba(5,20,5,0.7)" : p.status === "falhou" ? "rgba(20,5,5,0.7)" : "rgba(5,4,16,0.92)",
        border: p.status === "enviado" ? "1px solid rgba(74,222,128,0.18)" : p.status === "falhou" ? "1px solid rgba(248,113,113,0.18)" : "1px solid rgba(255,186,0,0.15)",
        backdropFilter: "blur(20px)",
      }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-black text-white">{p.displayName}</span>
            <StatusBadge status={p.status} />
            <span className="text-[10px] px-1.5 py-0.5 rounded font-black"
              style={{ background: p.tipo === "sorteio" ? "rgba(255,186,0,0.1)" : "rgba(139,92,246,0.15)", color: p.tipo === "sorteio" ? "#ffba00" : "#a78bfa" }}>
              {p.tipo}
            </span>
          </div>
          <p className="text-[11px] text-gray-600">@{p.username} · {fmtDate(p.criadoEm)}</p>
          {p.erro && <p className="text-[10px] text-red-400 mt-0.5">Erro: {p.erro}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-black text-white">R$ {fmtBRL(p.valor)}</p>
          <p className="text-[10px] text-gray-600">{p.tipoChave.toUpperCase()}</p>
        </div>
      </div>

      {p.status !== "enviado" && (
        <div className="px-4 pb-3 flex gap-2 border-t border-white/[0.04] pt-3">
          {/* Enviar via GGPix */}
          <button
            disabled={busy || !ggpixOk}
            onClick={onEnviar}
            title={!ggpixOk ? "Configure o GGPix para usar este recurso" : ""}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-[1.02] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, rgba(255,186,0,0.3), rgba(255,140,0,0.2))", color: "#ffba00", border: "1px solid rgba(255,186,0,0.35)" }}>
            {busy ? "..." : "⚡ Enviar PIX Auto"}
          </button>

          {/* Marcar como pago manualmente */}
          <button
            disabled={busy}
            onClick={onMarcarPago}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            style={{ color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", background: "rgba(74,222,128,0.06)" }}>
            {busy ? "..." : "✓ Marcar pago"}
          </button>

          {/* Remover */}
          <button
            disabled={busy}
            onClick={onRemover}
            className="px-2 py-1.5 rounded-lg text-[11px] font-black transition-all hover:bg-red-500/10 disabled:opacity-50"
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
  const [ggpixOk,   setGgpixOk]    = useState(false);
  const [busyId,    setBusyId]     = useState<string | null>(null);
  const [msg,       setMsg]         = useState<{ text: string; ok: boolean } | null>(null);
  const [limpando,  setLimpando]   = useState(false);

  const fetchAll = useCallback(async () => {
    const [pagRes, cfgRes] = await Promise.all([
      fetch("/api/gorjeta?tipo=pagamentos"),
      fetch("/api/config"),
    ]);
    if (pagRes.ok) { const d = await pagRes.json(); setPagamentos(d.pagamentos ?? []); }
    if (cfgRes.ok) { const d = await cfgRes.json(); setGgpixOk(d.ggpix?.ok ?? false); }
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

  async function enviar(id: string) {
    setBusyId(id);
    try {
      const d = await apiCall("fila-enviar", id);
      flash(d.ok ? "PIX enviado com sucesso! ✓" : `Falha: ${d.erro ?? "Erro desconhecido"}`, d.ok);
      await fetchAll();
    } finally { setBusyId(null); }
  }

  async function marcarPago(id: string) {
    setBusyId(id);
    try {
      await apiCall("fila-marcar-pago", id);
      flash("Marcado como pago.", true);
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
      flash("Enviados e com falha removidos.", true);
      await fetchAll();
    } finally { setLimpando(false); }
  }

  const pendentes = pagamentos.filter(p => p.status === "pendente");
  const enviados  = pagamentos.filter(p => p.status === "enviado");
  const falhos    = pagamentos.filter(p => p.status === "falhou");

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">Pagamentos</h1>
          <p className="text-sm text-gray-600 mt-1">
            {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""} · {enviados.length} enviado{enviados.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!ggpixOk && (
            <span className="text-[11px] font-black px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(234,179,8,0.1)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" }}>
              ⚠️ GGPix não configurado
            </span>
          )}
          {(enviados.length > 0 || falhos.length > 0) && (
            <button disabled={limpando} onClick={limpar}
              className="text-[11px] font-black px-3 py-1.5 rounded-xl transition-all hover:bg-red-500/10 disabled:opacity-50"
              style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}>
              {limpando ? "..." : "🗑 Limpar finalizados"}
            </button>
          )}
        </div>
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
          style={{ background: "rgba(5,4,16,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-3xl mb-3">💳</p>
          <p className="text-sm font-black text-white mb-1">Nenhum pagamento na fila</p>
          <p className="text-xs text-gray-600">Pagamentos serão adicionados aqui quando você usar a opção "Enviar para Pagamentos" no sorteio ou envio manual.</p>
        </div>
      )}

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Pendentes ({pendentes.length})</p>
          {pendentes.map(p => (
            <PagamentoCard key={p.id} p={p} ggpixOk={ggpixOk} busy={busyId === p.id}
              onEnviar={() => enviar(p.id)}
              onMarcarPago={() => marcarPago(p.id)}
              onRemover={() => remover(p.id)} />
          ))}
        </div>
      )}

      {/* Com falha */}
      {falhos.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Com falha ({falhos.length})</p>
          {falhos.map(p => (
            <PagamentoCard key={p.id} p={p} ggpixOk={ggpixOk} busy={busyId === p.id}
              onEnviar={() => enviar(p.id)}
              onMarcarPago={() => marcarPago(p.id)}
              onRemover={() => remover(p.id)} />
          ))}
        </div>
      )}

      {/* Enviados */}
      {enviados.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Enviados ({enviados.length})</p>
          {enviados.map(p => (
            <PagamentoCard key={p.id} p={p} ggpixOk={ggpixOk} busy={busyId === p.id}
              onEnviar={() => enviar(p.id)}
              onMarcarPago={() => marcarPago(p.id)}
              onRemover={() => remover(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
