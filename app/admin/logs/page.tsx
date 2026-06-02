"use client";

import { useState, useEffect } from "react";
import type { LogEntry } from "@/lib/security-log";

const ACTION_META: Record<string, { icon: string; label: string; color: string }> = {
  admin_login:    { icon: "🔑", label: "Login admin",          color: "#4ade80" },
  ban:            { icon: "🚫", label: "Usuário banido",        color: "#f87171" },
  unban:          { icon: "✅", label: "Usuário desbanido",     color: "#4ade80" },
  suspend:        { icon: "⏸",  label: "Usuário suspenso",      color: "#fbbf24" },
  unsuspend:      { icon: "▶️",  label: "Suspensão levantada",  color: "#4ade80" },
  config_livepix: { icon: "🎰", label: "Config LivePix salva",  color: "#4ade80" },
  config_ggpix:   { icon: "💰", label: "Config GGPix salva",    color: "#ffba00" },
  gorjeta_abrir:  { icon: "💸", label: "Gorjeta aberta",        color: "#ffba00" },
  gorjeta_fechar: { icon: "🔒", label: "Gorjeta fechada",       color: "#9ca3af" },
  gorjeta_pagar:  { icon: "💳", label: "PIX enviados",          color: "#4ade80" },
  acesso_negado:  { icon: "⛔", label: "Acesso negado",         color: "#f87171" },
};

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function LogRow({ entry }: { entry: LogEntry }) {
  const meta = ACTION_META[entry.action] ?? { icon: "📝", label: entry.action, color: "#9ca3af" };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black" style={{ color: meta.color }}>{meta.label}</span>
          {entry.target && (
            <span className="text-[11px] font-black text-gray-400">→ @{entry.target}</span>
          )}
          <span className="text-[11px] font-bold text-gray-600">por @{entry.admin}</span>
        </div>
        {entry.detail && (
          <p className="text-[11px] text-gray-600 mt-0.5 truncate">{entry.detail}</p>
        )}
        <p className="text-[10px] text-gray-700 mt-0.5">{fmtDate(entry.ts)}</p>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const [logs,       setLogs]       = useState<LogEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filtro,     setFiltro]     = useState<string>("todos");
  const [busca,      setBusca]      = useState("");
  const [testBusy,   setTestBusy]   = useState(false);
  const [testMsg,    setTestMsg]    = useState<string | null>(null);

  const fetchLogs = () => {
    fetch("/api/admin/logs")
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);

  async function testarLog() {
    setTestBusy(true);
    setTestMsg(null);
    const res = await fetch("/api/admin/logs", { method: "POST" });
    if (res.ok) {
      setTestMsg("✅ Log registrado com sucesso! Apareceu na lista abaixo.");
      fetchLogs();
    } else {
      setTestMsg("❌ Falhou — verifique o banco de dados.");
    }
    setTestBusy(false);
    setTimeout(() => setTestMsg(null), 5000);
  }

  const categorias = [
    { key: "todos",     label: "Todos" },
    { key: "ban",       label: "Banimentos" },
    { key: "config",    label: "Configurações" },
    { key: "gorjeta",   label: "Gorjeta" },
    { key: "login",     label: "Logins" },
    { key: "negado",    label: "Negados" },
  ];

  const filtered = logs.filter(l => {
    const q = busca.toLowerCase();
    const matchSearch = !q || l.target?.includes(q) || l.admin.includes(q) || l.detail?.toLowerCase().includes(q);
    const matchFiltro = filtro === "todos"
      || (filtro === "ban"     && (l.action === "ban" || l.action === "unban" || l.action === "suspend" || l.action === "unsuspend"))
      || (filtro === "config"  && (l.action === "config_livepix" || l.action === "config_ggpix"))
      || (filtro === "gorjeta" && l.action.startsWith("gorjeta"))
      || (filtro === "login"   && l.action === "admin_login")
      || (filtro === "negado"  && l.action === "acesso_negado");
    return matchSearch && matchFiltro;
  });

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-24">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Logs de Segurança</h1>
          <p className="text-sm text-gray-600 mt-1">{logs.length} registros totais</p>
        </div>
        <button
          disabled={testBusy}
          onClick={testarLog}
          className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.1)" }}>
          {testBusy ? "..." : "🧪 Testar log"}
        </button>
      </div>
      {testMsg && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-black ${testMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}
          style={testMsg.startsWith("✅")
            ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }
            : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          {testMsg}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4">
        {categorias.map(c => (
          <button key={c.key} onClick={() => setFiltro(c.key)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-black transition-all"
            style={filtro === c.key
              ? { background: "rgba(255,186,0,0.12)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }
              : { color: "#4b5563", border: "1px solid rgba(255,255,255,0.07)" }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
        <input type="text" placeholder="Buscar por admin, usuário ou detalhe..."
          value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
          style={{ background: "rgba(6,15,9,0.92)", border: `1px solid ${busca ? "rgba(255,186,0,0.35)" : "rgba(255,255,255,0.08)"}`, backdropFilter: "blur(20px)" }} />
        {busca && <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">✕</button>}
      </div>

      {/* Lista */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(6,15,9,0.92)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-sm text-gray-600">Nenhum log encontrado</p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 max-h-[calc(100vh-280px)] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,186,0,0.2) transparent" }}>
            {filtered.map(l => <LogRow key={l.id} entry={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
