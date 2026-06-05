"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/admins";

interface Participant { username: string; displayName: string; image: string | null; }
interface RaceData { participants: Participant[]; numVencedores: number; topN?: number; top?: number; maxVencedores?: number; saldoRestante: number; }
interface Winner { place: number; username: string; displayName: string; image: string | null; }
interface RacePayload {
  jogadores: string[];
  participants: Participant[];
  players: Participant[];
  topN: number;
  numVencedores: number;
  top: number;
  maxVencedores: number;
  backUrl: string;
}

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function medal(i: number) { return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`; }
function topValido(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function normalizarTop(data: RaceData, urlTop?: number) {
  const fromUrl = topValido(urlTop);
  const raw = fromUrl || Math.max(
    topValido(data.numVencedores),
    topValido(data.topN),
    topValido(data.top),
    topValido(data.maxVencedores),
    1,
  );
  return Math.max(1, Number.isFinite(raw) ? Math.floor(raw) : 1);
}

export default function CorridaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [phase, setPhase] = useState<"racing" | "result">("racing");
  const [winners, setWinners] = useState<Winner[]>([]);
  const [valores, setValores] = useState<number[]>([]);
  const [ggpixOk, setGgpixOk] = useState(false);
  const [enviando, setEnviando] = useState<"" | "auto" | "fila">("");
  const [enviado, setEnviado] = useState(false);
  const [erroDados, setErroDados] = useState(false);
  const [jogoPronto, setJogoPronto] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const raceDataRef = useRef<RaceData | null>(null);
  const phaseRef = useRef<"racing" | "result">("racing");


  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);


  useEffect(() => {
    const raw = localStorage.getItem("corrida-race-data");
    if (!raw) { setErroDados(true); return; }
    try {
      const data = JSON.parse(raw) as RaceData;
      if (!data.participants?.length) { setErroDados(true); return; }
      const urlTop = Number(new URLSearchParams(window.location.search).get("top") || 0);
      const top = normalizarTop(data, urlTop);
      const normalizedData: RaceData = { ...data, numVencedores: top, topN: top, top, maxVencedores: top };
      raceDataRef.current = normalizedData;
      setRaceData(normalizedData);

      const jogadores = normalizedData.participants.map(p => p.displayName || p.username);
      const payload: RacePayload = {
        jogadores,
        participants: normalizedData.participants,
        players: normalizedData.participants,
        topN: top,
        numVencedores: top,
        top,
        maxVencedores: top,
        backUrl: "/admin/gorjeta",
      };
      const w = window as Window & { CORRIDA_DADOS_JSON?: string; GORGITA_RACE_DATA?: RacePayload; GORJETA_RACE_DATA?: RacePayload };
      w.GORJETA_RACE_DATA = payload;
      w.GORGITA_RACE_DATA = payload;
      w.CORRIDA_DADOS_JSON = JSON.stringify(payload);
      setIframeReady(true);
    } catch { setErroDados(true); }
    fetch("/api/config").then(r => r.ok ? r.json() : null).then(d => setGgpixOk(!!d?.ggpix?.ok)).catch(() => {});
  }, []);


  useEffect(() => {
    if (!iframeReady) return;
    const t = setTimeout(() => setJogoPronto(true), 30000);
    return () => clearTimeout(t);
  }, [iframeReady]);

  const findParticipant = useCallback((nome: string): Participant | undefined => {
    const data = raceDataRef.current; if (!data) return undefined;
    const n = nome.trim().toLowerCase();
    return data.participants.find(p => (p.displayName || "").toLowerCase() === n)
        ?? data.participants.find(p => p.username.toLowerCase() === n);
  }, []);

  const handleWinners = useCallback((raw: Array<{ place?: number; name: string }>) => {
    if (phaseRef.current === "result") return;
    const data = raceDataRef.current;
    const ws: Winner[] = raw.map((it, i) => {
      const part = findParticipant(it.name);
      return { place: it.place ?? i + 1, username: part?.username ?? it.name, displayName: part?.displayName ?? it.name, image: part?.image ?? null };
    });
    setWinners(ws);
    const sug = data ? Math.max(1, Math.floor(data.saldoRestante / Math.max(1, ws.length))) : 10;
    setValores(ws.map(() => sug));
    phaseRef.current = "result";
    setPhase("result");
  }, [findParticipant]);


  useEffect(() => {
    function onMsg(e: MessageEvent) {
      let data: { type?: string; payload?: { winners?: Array<{ place?: number; name: string }> } };
      try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!data || typeof data !== "object" || typeof data.type !== "string" || !data.type.startsWith("marble:")) return;

      setJogoPronto(true);
      if (data.type === "marble:ready") {

        const rd = raceDataRef.current;
        if (rd && iframeRef.current?.contentWindow) {
          const jogadores = rd.participants.map(p => p.displayName || p.username);
          iframeRef.current.contentWindow.postMessage(JSON.stringify({
            type: "marble:init",
            payload: {
              jogadores,
              players: rd.participants,
              participants: rd.participants,
              topN: rd.numVencedores,
              numVencedores: rd.numVencedores,
              top: rd.numVencedores,
              maxVencedores: rd.numVencedores,
            },
          }), "*");
        }
      } else if (data.type === "marble:finish") {
        handleWinners(data.payload?.winners ?? []);
      } else if (data.type === "marble:backToTip") {
        router.push("/admin/gorjeta");
      }
    }
    window.addEventListener("message", onMsg);
    const w = window as Window & { corridaResultado?: (nomes: string[]) => void };
    w.corridaResultado = (nomes: string[]) => handleWinners((nomes || []).map((name, i) => ({ place: i + 1, name })));
    return () => {
      window.removeEventListener("message", onMsg);
      delete (window as Window & { corridaResultado?: unknown }).corridaResultado;
    };
  }, [handleWinners, router]);

  async function enviar(modo: "auto" | "fila") {
    if (enviado || enviando) return;
    setEnviando(modo);
    const action = modo === "auto" ? "enviar-manual" : "enviar-manual-fila";
    let allOk = true;
    for (let i = 0; i < winners.length; i++) {
      const v = valores[i] || 0; if (v <= 0) continue;
      try {
        const r = await fetch("/api/gorjeta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, username: winners[i].username, valor: v }) });
        if (!r.ok) allOk = false;
      } catch { allOk = false; }
    }
    setEnviando("");
    if (allOk) {
      setEnviado(true);
      if (modo === "fila") router.push("/admin/gorjeta/pagamentos");
    }
  }

  const total = valores.reduce((s, v) => s + (v || 0), 0);
  const saldo = raceData?.saldoRestante ?? 0;
  const cobre = total <= saldo;

  if (erroDados) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060e0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-400">Nenhum inscrito carregado. Abra pela <strong className="text-white">Gorjeta → aba Corrida</strong>.</p>
          <button onClick={() => router.push("/admin/gorjeta")} className="px-5 py-2.5 rounded-xl font-black text-sm text-black" style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>← Voltar para Gorjeta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#050d08] flex flex-col">

      <div className="flex-shrink-0 px-4 py-2.5 flex items-center gap-3 border-b border-white/10" style={{ background: "rgba(5,13,8,0.98)" }}>
        <button onClick={() => router.push("/admin/gorjeta")} className="text-gray-400 hover:text-white text-sm font-bold transition-colors">← Voltar para Gorjeta</button>
        <span className="text-white font-black flex-1 truncate text-sm">🏁 Corrida do stainzin</span>
        {raceData && <span className="text-[11px] text-gray-500">{raceData.participants.length} na pista · Top {raceData.numVencedores}</span>}
      </div>


      <div className="flex-1 relative bg-black">
        {iframeReady && (
          <iframe
            ref={iframeRef}
            src={`/marble-web/index.html?top=${raceData?.numVencedores ?? 1}`}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; gamepad"
            title="Corrida do stainzin" />
        )}

        {(!iframeReady || !jogoPronto) && phase === "racing" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5"
            style={{ background: "linear-gradient(160deg,#071a0f,#04100a)" }}>
            <div className="text-5xl" style={{ animation: "bob 1.4s ease-in-out infinite" }}>🏁</div>
            <div className="w-12 h-12 rounded-full border-[3px] border-[#ffba00]/30 border-t-[#ffba00] animate-spin" />
            <p className="text-sm font-black text-white">Carregando a corrida...</p>
            <p className="text-[11px] text-gray-500">Preparando a pista e os participantes</p>
            <style>{`@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
          </div>
        )}


        {phase === "result" && (
          <div className="absolute inset-0 z-10 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6">
            <div className="max-w-xl mx-auto space-y-4 py-4">
              <div className="text-center" style={{ animation: "popIn .5s ease-out" }}>
                <p className="text-4xl font-black text-white">🏆 Resultado!</p>
                <p className="text-gray-500 text-sm mt-1">Top {raceData?.numVencedores} da corrida</p>
              </div>

              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)" }}>
                <span className="text-xs font-black text-gray-400 flex-1">Mesmo valor pra todos (R$)</span>
                <input type="text" inputMode="decimal" placeholder="0,00"
                  onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v) && v >= 0) setValores(winners.map(() => v)); }}
                  className="w-28 px-3 py-2 rounded-xl text-sm font-black text-white text-right outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,186,0,0.3)" }} />
              </div>

              <div className="space-y-2">
                {winners.length === 0 && (
                  <div className="rounded-2xl px-4 py-5 text-center" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)" }}>
                    <p className="text-sm font-black text-red-300">A corrida terminou sem enviar vencedores.</p>
                    <p className="text-xs text-gray-500 mt-1">Reexporte o Godot com este fix e rode a corrida novamente.</p>
                  </div>
                )}
                {winners.map((w, i) => (
                  <div key={w.username + i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", animation: `popIn .4s ease-out ${i * 0.05}s both` }}>
                    <span className="text-base w-9 text-center flex-shrink-0">{medal(i)}</span>
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-[#ffba00]" style={{ background: "rgba(255,186,0,0.12)", border: "2px solid rgba(255,186,0,0.25)" }}>
                      {w.image ? <img src={w.image} alt="" className="w-full h-full object-cover" /> : (w.displayName || w.username)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">{w.displayName}</p>
                      <p className="text-[10px] text-gray-600">@{w.username}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-black text-[#ffba00]">R$</span>
                      <input type="text" inputMode="decimal" value={valores[i] ?? ""}
                        onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); setValores(arr => arr.map((x, k) => k === i ? (isNaN(v) ? 0 : v) : x)); }}
                        className="w-20 px-2 py-1.5 rounded-lg text-sm font-black text-white text-right outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: cobre ? "rgba(34,197,94,0.06)" : "rgba(248,113,113,0.08)", border: `1px solid ${cobre ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.3)"}` }}>
                <span className="text-xs font-black text-gray-400">Total a pagar</span>
                <span className="text-lg font-black" style={{ color: cobre ? "#4ade80" : "#f87171" }}>R$ {fmtBRL(total)} <span className="text-[11px] text-gray-600">/ saldo R$ {fmtBRL(saldo)}</span></span>
              </div>
              {!cobre && <p className="text-center text-xs text-red-400 font-bold">Total passa do saldo — reduza os valores.</p>}

              {enviado ? (
                <div className="text-center space-y-3 py-2">
                  <p className="text-lg font-black text-green-400">✓ Pagamentos registrados!</p>
                  <button onClick={() => router.push("/admin/gorjeta")} className="w-full py-3.5 rounded-2xl font-black text-sm text-black" style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>← Voltar para Gorjeta</button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button onClick={() => enviar("auto")} disabled={!!enviando || !cobre || !ggpixOk || winners.length === 0} className="py-4 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] disabled:cursor-not-allowed"
                      style={(ggpixOk && cobre && winners.length > 0) ? { background: "linear-gradient(135deg,#4ade80,#22c55e)", color: "#000" } : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#4b5563" }}>
                      {!ggpixOk ? "⚡ PIX automático (GGPix off)" : enviando === "auto" ? "Enviando..." : "⚡ Enviar PIX a todos"}
                    </button>
                    <button onClick={() => enviar("fila")} disabled={!!enviando || !cobre || winners.length === 0} className="py-4 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-60" style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>
                      {enviando === "fila" ? "..." : "💳 Pagamento manual"}
                    </button>
                  </div>
                  <button onClick={() => router.push("/admin/gorjeta")} className="w-full py-2.5 rounded-2xl font-black text-xs hover:bg-white/5 transition-colors" style={{ color: "#6b7280" }}>← Voltar para Gorjeta (sem pagar agora)</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes popIn { 0% { opacity:0; transform:scale(0.7) translateY(10px); } 100% { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}
