"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { CadastroGorjeta, SessaoGorjeta, TransacaoGorjeta } from "@/lib/gorjeta-store";

const CSS = `
  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(24px) scale(0.94); }
    to   { opacity:1; transform:translateY(0)    scale(1);    }
  }
  @keyframes winnerDrop {
    0%   { opacity:0; transform:translateY(-20px) scale(0.8); }
    55%  { transform:translateY(5px) scale(1.05); }
    80%  { transform:translateY(-2px) scale(0.99); }
    100% { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes goldGlow {
    0%,100% { box-shadow: 0 0 18px rgba(255,186,0,0.35), 0 0 40px rgba(255,186,0,0.10), inset 0 0 12px rgba(255,186,0,0.04); }
    50%      { box-shadow: 0 0 32px rgba(255,186,0,0.65), 0 0 70px rgba(255,186,0,0.22), inset 0 0 18px rgba(255,186,0,0.08); }
  }
  @keyframes shimmer {
    0%   { background-position:-200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes liveRing {
    0%,100% { transform:scale(1);   opacity:0.7; }
    50%      { transform:scale(1.8); opacity:0;   }
  }
  @keyframes floatBadge {
    0%,100% { transform:translateY(0);  }
    50%      { transform:translateY(-4px); }
  }
  @keyframes confettiPop {
    0%  { opacity:0; transform:scale(0) rotate(-20deg); }
    60% { opacity:1; transform:scale(1.15) rotate(4deg); }
    100%{ opacity:1; transform:scale(1) rotate(0deg); }
  }
  .winner-glow { animation: goldGlow 2.2s ease-in-out infinite; }
  .live-ring   { animation: liveRing 1.4s ease-out infinite; }
  .float-badge { animation: floatBadge 3s ease-in-out infinite; }
`;

function formatCpfInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function mascarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

const posMeta: Record<number, { icon: string; grad: string; ringColor: string }> = {
  1: { icon: "👑", grad: "linear-gradient(135deg,#ffe55a,#ffba00)", ringColor: "rgba(255,186,0,0.85)" },
  2: { icon: "🥈", grad: "linear-gradient(135deg,#d8dee8,#a8b4c0)", ringColor: "rgba(200,210,220,0.7)"  },
  3: { icon: "🥉", grad: "linear-gradient(135deg,#e8a060,#c97030)", ringColor: "rgba(210,140,80,0.7)"   },
};

function VencedorCard({ v, pos, pag, delay }: {
  v: { image: string | null; displayName: string; username: string };
  pos: number;
  pag?: TransacaoGorjeta;
  delay: number;
}) {
  const meta = posMeta[pos] ?? { icon: `#${pos}`, grad: "linear-gradient(135deg,#ffdd55,#ffba00)", ringColor: "rgba(255,186,0,0.6)" };
  const isFirst = pos === 1;

  return (
    <div className={`relative overflow-hidden rounded-2xl flex flex-col items-center${isFirst ? " winner-glow" : ""}`}
      style={{
        background: "linear-gradient(160deg,rgba(28,22,6,0.98) 0%,rgba(14,10,2,0.99) 100%)",
        border: `2px solid ${isFirst ? "rgba(255,186,0,0.6)" : pos === 2 ? "rgba(200,210,220,0.35)" : "rgba(210,140,80,0.35)"}`,
        animation: `winnerDrop 0.65s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
      }}>
      {/* Ambient glow from avatar */}
      {v.image && (
        <img src={v.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(24px) brightness(0.15) saturate(1.5)", transform: "scale(1.4)" }} />
      )}
      {/* Gold shimmer overlay for 1st */}
      {isFirst && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.06) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }} />
      )}

      <div className="relative z-10 flex flex-col items-center gap-2 px-4 pt-5 pb-4 w-full">
        {/* Position badge */}
        <div className="float-badge">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shadow-lg"
            style={{ background: meta.grad, boxShadow: `0 4px 14px ${meta.ringColor}` }}>
            <span style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>{meta.icon}</span>
          </div>
        </div>

        {/* Avatar */}
        {v.image
          ? <img src={v.image} alt={v.displayName}
              className={`object-cover rounded-full ${isFirst ? "w-20 h-20" : "w-16 h-16"}`}
              style={{ border: `3px solid ${meta.ringColor}`, boxShadow: `0 0 20px ${meta.ringColor}` }} />
          : <div className={`rounded-full flex items-center justify-center font-black text-[#ffba00] ${isFirst ? "w-20 h-20 text-3xl" : "w-16 h-16 text-2xl"}`}
              style={{ background: "rgba(255,186,0,0.08)", border: `3px solid ${meta.ringColor}` }}>
              {v.displayName[0]?.toUpperCase()}
            </div>
        }

        <p className={`font-black text-white text-center truncate w-full ${isFirst ? "text-base" : "text-sm"}`}>
          {v.displayName}
        </p>

        {pag && (
          <span className="text-[10px] font-black px-3 py-1 rounded-full"
            style={pag.status === "enviado"
              ? { background: "rgba(34,197,94,0.18)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.4)" }
              : { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
            {pag.status === "enviado" ? "✓ PIX enviado" : "✗ Falhou"}
          </span>
        )}
        {!pag && (
          <span className="text-[10px] font-black px-3 py-1 rounded-full"
            style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }}>
            Vencedor 🎉
          </span>
        )}
      </div>
    </div>
  );
}

function ParticipanteCard({ p, isVoce }: {
  p: { image: string | null; displayName: string; username: string };
  isVoce?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl flex flex-col items-center"
      style={{
        background: isVoce ? "rgba(255,186,0,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isVoce ? "rgba(255,186,0,0.4)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: isVoce ? "0 0 12px rgba(255,186,0,0.12)" : "none",
      }}>
      {p.image && (
        <img src={p.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(10px) brightness(0.15)", transform: "scale(1.3)" }} />
      )}
      <div className="relative z-10 flex flex-col items-center gap-1 px-2 pt-3 pb-2.5 w-full">
        {p.image
          ? <img src={p.image} alt={p.displayName} className="w-10 h-10 rounded-full object-cover"
              style={{ border: `2px solid ${isVoce ? "rgba(255,186,0,0.6)" : "rgba(255,255,255,0.1)"}` }} />
          : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[#ffba00] text-sm"
              style={{ background: "rgba(255,186,0,0.08)", border: "2px solid rgba(255,186,0,0.2)" }}>
              {p.displayName[0]?.toUpperCase()}
            </div>
        }
        <p className="text-[9px] font-black text-white/80 text-center truncate w-full leading-tight">{p.displayName}</p>
        {isVoce && (
          <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(255,186,0,0.18)", color: "#ffba00" }}>você</span>
        )}
      </div>
    </div>
  );
}

function SessaoAoVivo({ sessao, cadastro }: { sessao: SessaoGorjeta; cadastro: CadastroGorjeta | null }) {
  const isAberta = sessao.status === "aberta";
  const jaParticipa = cadastro?.status === "aprovado" &&
    sessao.participantes.some(p => p.username === cadastro.username);

  const [shownWinners, setShownWinners] = useState<typeof sessao.vencedores>([]);
  const winnersKey = useRef("");
  useEffect(() => {
    const key = sessao.vencedores.map(v => v.username).join(",");
    if (key === winnersKey.current) return;
    winnersKey.current = key;
    setShownWinners([]);
    if (sessao.vencedores.length === 0) return;
    sessao.vencedores.forEach((v, i) => {
      setTimeout(() => setShownWinners(prev => [...prev, v]), (i + 1) * 1400);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao.vencedores.map(v => v.username).join(",")]);

  const saldoRestante = (sessao as SessaoGorjeta & { saldoRestante?: number }).saldoRestante ?? 0;

  return (
    <div className="space-y-4">
      {/* Live banner */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(20,14,2,0.98) 0%, rgba(30,20,0,0.98) 100%)",
          border: "1px solid rgba(255,186,0,0.35)",
          boxShadow: "0 4px 40px rgba(255,186,0,0.1), 0 1px 0 rgba(255,186,0,0.2) inset",
        }}>
        {/* Glow strip */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,186,0,0.6), transparent)" }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5">
          <span className="relative flex h-3 w-3 flex-shrink-0">
            {isAberta && <span className="live-ring absolute inline-flex h-full w-full rounded-full bg-[#ffba00]" />}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isAberta ? "bg-[#ffba00]" : "bg-amber-600"}`} />
          </span>
          <span className="text-[11px] font-black text-[#ffba00] uppercase tracking-widest flex-1">
            {isAberta ? "Gorjeta ao vivo" : "Sorteio realizado"}
          </span>
          {isAberta && (
            <span className="text-[11px] px-3 py-1 rounded-full font-black text-black"
              style={{ background: "linear-gradient(135deg,#ffe55a,#ffba00)", boxShadow: "0 2px 10px rgba(255,186,0,0.4)" }}>
              LIVE
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border-t border-white/5">
          {[
            { label: "Saldo", value: `R$ ${saldoRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, gold: true },
            { label: "Inscritos", value: sessao.participantes.length.toString(), gold: false },
            { label: "Vencedores", value: (sessao.vencedores.length || sessao.maxVencedores || "—").toString(), gold: false },
          ].map((s, idx) => (
            <div key={idx} className="py-4 text-center" style={{ borderLeft: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-lg font-black ${s.gold ? "" : "text-white"}`}
                style={s.gold ? { background: "linear-gradient(135deg,#ffba00,#ffdd55)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : {}}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* CTA for participant */}
        {isAberta && cadastro?.status === "aprovado" && (
          <div className="border-t border-white/5 px-5 py-3 flex items-center gap-2"
            style={{ background: jaParticipa ? "rgba(34,197,94,0.06)" : "rgba(255,186,0,0.04)" }}>
            <span className="text-base">{jaParticipa ? "✅" : "💬"}</span>
            <span className={`text-sm font-black ${jaParticipa ? "text-green-400" : "text-[#ffba00]"}`}>
              {jaParticipa ? "Você está inscrito!" : "Digite !gorjeta no chat para participar"}
            </span>
          </div>
        )}
        {isAberta && cadastro?.status !== "aprovado" && (
          <div className="border-t border-white/5 px-5 py-3"
            style={{ background: "rgba(255,186,0,0.03)" }}>
            <span className="text-[11px] text-gray-500">
              {!cadastro ? "Cadastre-se abaixo para participar das gorjetas" : "Aguarde a aprovação do seu cadastro para participar"}
            </span>
          </div>
        )}
      </div>

      {/* Vencedores */}
      {shownWinners.length > 0 && (
        <div className="space-y-3" style={{ animation: "fadeInUp 0.4s ease-out" }}>
          {/* Título vencedores */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,186,0,0.4), transparent)" }} />
            <span className="text-[11px] font-black text-[#ffba00] uppercase tracking-[0.2em]">🏆 Vencedores</span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, rgba(255,186,0,0.4))" }} />
          </div>

          {/* Winner cards grid */}
          <div className={`grid gap-3 ${
            shownWinners.length === 1 ? "grid-cols-1 max-w-[200px] mx-auto" :
            shownWinners.length === 2 ? "grid-cols-2" :
            "grid-cols-3"
          }`}>
            {shownWinners.map((v, i) => (
              <VencedorCard key={v.username} v={v} pos={i + 1} delay={0}
                pag={sessao.transacoes?.find(t => t.username === v.username && t.tipo === "sorteio")} />
            ))}
          </div>
        </div>
      )}

      {/* Participantes */}
      {sessao.participantes.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(12,9,2,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex-1">Participantes</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black"
              style={{ background: "rgba(255,186,0,0.08)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.15)" }}>
              {sessao.participantes.length}
            </span>
          </div>
          <div className="p-3 overflow-y-auto" style={{ maxHeight: 260, scrollbarWidth: "thin", scrollbarColor: "rgba(255,186,0,0.15) transparent" }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))" }}>
              {sessao.participantes.map(p => (
                <ParticipanteCard key={p.username} p={p}
                  isVoce={jaParticipa && p.username === cadastro?.username} />
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: "pendente" | "aprovado" | "rejeitado" }) {
  const map = {
    pendente:  { label: "Aguardando aprovação", color: "#ffba00", bg: "rgba(255,186,0,0.1)",  border: "rgba(255,186,0,0.25)"  },
    aprovado:  { label: "Aprovado ✓",           color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)" },
    rejeitado: { label: "Rejeitado",             color: "#f87171", bg: "rgba(248,113,113,0.1)",border: "rgba(248,113,113,0.25)"},
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

export default function GorjetaPage() {
  const { data: session, status } = useSession();
  const [cadastro, setCadastro] = useState<CadastroGorjeta | null | undefined>(undefined);
  const [sessao, setSessao] = useState<SessaoGorjeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nomeCompleto: "", cpf: "", screenshot: "" });
  const [screenshotName, setScreenshotName] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/gorjeta");
    const data = await res.json();
    const s: SessaoGorjeta | null = data.sessao ?? null;
    setSessao(s && (s.status === "aberta" || s.status === "sorteada") ? s : null);
    if (data.meucadastro !== undefined) setCadastro(data.meucadastro ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [fetchData]);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErro("Envie uma imagem (PNG, JPG, etc.)"); return; }
    if (file.size > 5 * 1024 * 1024) { setErro("Imagem muito grande (máx 5MB)"); return; }
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, screenshot: e.target?.result as string ?? "" }));
    reader.readAsDataURL(file);
  }

  async function enviar() {
    setErro("");
    if (!form.nomeCompleto.trim()) return setErro("Informe seu nome completo");
    if (form.cpf.replace(/\D/g, "").length !== 11) return setErro("CPF inválido (11 dígitos)");
    if (!form.screenshot) return setErro("Envie o comprovante de depósito");
    setEnviando(true);
    try {
      const res = await fetch("/api/gorjeta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cadastrar", ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao enviar"); return; }
      setCadastro(data.cadastro);
    } catch { setErro("Erro de conexão"); }
    finally { setEnviando(false); }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #ffba00, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Gorjeta</span>
        </div>

        {/* Page title */}
        <div>
          <h1 className="text-3xl font-black text-white">Gorjeta 💰</h1>
          <p className="text-sm text-gray-500 mt-1">Receba PIX direto do streamer — entre pela chat!</p>
        </div>

        {/* Sessão ativa */}
        {sessao && <SessaoAoVivo sessao={sessao} cadastro={cadastro ?? null} />}

        {/* Sem sessão ativa */}
        {!sessao && (
          <div className="relative overflow-hidden rounded-2xl text-center py-16 px-6"
            style={{ background: "rgba(12,9,2,0.85)", border: "1px solid rgba(255,186,0,0.12)", boxShadow: "0 0 40px rgba(255,186,0,0.04)" }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
              style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.15)" }}>
              <span className="text-4xl">💰</span>
            </div>
            <h2 className="text-lg font-black text-white mb-2">Nenhuma gorjeta ativa</h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">Fique de olho! O streamer pode abrir uma gorjeta a qualquer momento ao vivo.</p>
          </div>
        )}

        {/* Login necessário */}
        {status === "unauthenticated" && (
          <div className="rounded-2xl p-7 text-center"
            style={{ background: "rgba(12,9,2,0.85)", border: "1px solid rgba(255,186,0,0.15)" }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: "rgba(255,186,0,0.08)", border: "1px solid rgba(255,186,0,0.2)" }}>🔐</div>
            <p className="text-base font-black text-white mb-1">Faça login para se cadastrar</p>
            <p className="text-xs text-gray-500 mb-5">Conecte sua conta Twitch para participar das gorjetas</p>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm text-black transition-all hover:scale-[1.04] active:scale-95"
              style={{ background: "linear-gradient(135deg,#ffe55a,#ffba00)", boxShadow: "0 4px 18px rgba(255,186,0,0.35)" }}>
              Login com Twitch
            </Link>
          </div>
        )}

        {/* Formulário de cadastro */}
        {status === "authenticated" && cadastro === null && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(12,9,2,0.9)", border: "1px solid rgba(255,186,0,0.2)", boxShadow: "0 4px 30px rgba(255,186,0,0.06)" }}>
            <div className="px-5 py-4 border-b border-white/[0.06]"
              style={{ background: "rgba(255,186,0,0.03)" }}>
              <h2 className="text-sm font-black text-white">Cadastro para gorjeta</h2>
              <p className="text-xs text-gray-500 mt-0.5">Preencha seus dados para receber PIX automaticamente</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Nome Completo</label>
                <input type="text" placeholder="Seu nome como no banco"
                  value={form.nomeCompleto}
                  onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">CPF (chave PIX)</label>
                <input type="text" placeholder="000.000.000-00" inputMode="numeric"
                  value={form.cpf}
                  onChange={e => setForm(f => ({ ...f, cpf: formatCpfInput(e.target.value) }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Comprovante de depósito</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all hover:bg-white/[0.03]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                  {form.screenshot
                    ? <><span className="text-green-400 font-bold">✓</span><span className="text-white text-xs truncate flex-1 text-left">{screenshotName}</span></>
                    : <><span className="text-xl">📎</span><span className="text-gray-500 text-sm">Clique para enviar a imagem</span></>
                  }
                </button>
                {form.screenshot && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.screenshot} alt="preview" className="w-full max-h-48 object-cover" />
                  </div>
                )}
              </div>
              {erro && <p className="text-sm text-red-400 font-bold">{erro}</p>}
              <button onClick={enviar} disabled={enviando}
                className="w-full py-3 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#ffe55a,#ffba00)", boxShadow: "0 4px 18px rgba(255,186,0,0.3)" }}>
                {enviando ? "Enviando..." : "Enviar cadastro"}
              </button>
            </div>
          </div>
        )}

        {/* Status do cadastro */}
        {status === "authenticated" && cadastro && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(12,9,2,0.9)", border: "1px solid rgba(255,186,0,0.14)" }}>
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white">Seu cadastro</h2>
                <p className="text-xs text-gray-500 mt-0.5">{cadastro.nomeCompleto}</p>
              </div>
              <StatusBadge status={cadastro.status} />
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">CPF</p>
                  <p className="text-sm font-black text-white">{mascarCpf(cadastro.cpf)}</p>
                </div>
                <div className="rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Enviado em</p>
                  <p className="text-sm font-black text-white">{new Date(cadastro.criadoEm).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              {cadastro.status === "pendente" && (
                <div className="rounded-xl px-4 py-3 text-sm text-[#ffba00]"
                  style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.15)" }}>
                  ⏳ Aguardando aprovação. Quando aprovado, digite <strong>!gorjeta</strong> no chat!
                </div>
              )}
              {cadastro.status === "aprovado" && (
                <div className="rounded-xl px-4 py-3 text-sm text-green-400"
                  style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                  ✅ Aprovado! Quando houver gorjeta ativa, digite <strong className="text-white">!gorjeta</strong> no chat.
                </div>
              )}
              {cadastro.status === "rejeitado" && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3 text-sm text-red-400"
                    style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                    ❌ Rejeitado{cadastro.motivoRejeicao ? `: ${cadastro.motivoRejeicao}` : "."}
                  </div>
                  <button onClick={() => setCadastro(null)}
                    className="w-full py-2.5 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg,#ffe55a,#ffba00)" }}>
                    Enviar novo cadastro
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Como funciona */}
        <div className="rounded-2xl px-5 py-5"
          style={{ background: "rgba(8,6,2,0.7)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Como funciona</p>
          <div className="space-y-2.5">
            {[
              { n: "1", text: "Cadastre-se com seu nome completo e CPF (chave PIX)", icon: "📝" },
              { n: "2", text: "Aguarde a aprovação do admin", icon: "⏳" },
              { n: "3", text: <>Quando o streamer abrir uma gorjeta, digite <strong className="text-gray-300">!gorjeta</strong> no chat</>, icon: "💬" },
              { n: "4", text: "Se sorteado, o PIX é enviado automaticamente!", icon: "🎉" },
            ].map(item => (
              <div key={item.n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0 mt-0.5"
                  style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>{item.n}</div>
                <p className="text-sm text-gray-500 leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
