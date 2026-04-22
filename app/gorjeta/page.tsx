"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { CadastroGorjeta, SessaoGorjeta } from "@/lib/gorjeta-store";

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

function Avatar({ image, name, size = 8 }: { image: string | null; name: string; size?: number }) {
  const sz = `w-${size} h-${size}`;
  if (image) {
    return <img src={image} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0 ring-2 ring-[#ffba00]/20`} />;
  }
  return (
    <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#ffba00]`}
      style={{ background: "rgba(255,186,0,0.1)", border: "1px solid rgba(255,186,0,0.2)", fontSize: size * 1.5 }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

function SessaoAoVivo({ sessao, cadastro }: { sessao: SessaoGorjeta; cadastro: CadastroGorjeta | null }) {
  const isAberta = sessao.status === "aberta";
  const isSorteada = sessao.status === "sorteada" || sessao.status === "fechada";
  const jaParticipa = cadastro?.status === "aprovado" &&
    sessao.participantes.some(p => p.username === cadastro.username);

  return (
    <div className="space-y-4">
      {/* Header da sessão */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(8,6,20,0.85)", border: "1px solid rgba(255,186,0,0.3)", backdropFilter: "blur(16px)", boxShadow: "0 0 40px rgba(255,186,0,0.06)" }}>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            {isAberta && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffba00] opacity-60" />}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffba00]" />
          </span>
          <span className="text-[11px] font-black text-[#ffba00] uppercase tracking-widest flex-1">
            {isAberta ? "Gorjeta ao vivo" : "Vencedores sorteados"}
          </span>
          {isAberta && (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-black text-black"
              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
              LIVE
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
          <div className="px-5 py-4 text-center">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Valor</p>
            <p className="text-xl font-black" style={{
              background: "linear-gradient(135deg, #ffba00, #ffdd55)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>R$ {sessao.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Vencedores</p>
            <p className="text-xl font-black text-white">{sessao.maxVencedores}</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Inscritos</p>
            <p className="text-xl font-black text-white">{sessao.participantes.length}</p>
          </div>
        </div>

        {/* Call to action (se aprovado e aberta) */}
        {isAberta && cadastro?.status === "aprovado" && (
          <div className={`px-5 py-3 text-sm font-black text-center ${jaParticipa ? "text-green-400" : "text-[#ffba00]"}`}
            style={{ background: jaParticipa ? "rgba(34,197,94,0.06)" : "rgba(255,186,0,0.06)" }}>
            {jaParticipa ? "✅ Você está inscrito!" : "Digite !gorjeta no chat para participar"}
          </div>
        )}
      </div>

      {/* Vencedores sorteados */}
      {sessao.vencedores.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(8,6,20,0.8)", border: "1px solid rgba(255,186,0,0.18)", backdropFilter: "blur(12px)" }}>
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-[11px] font-black text-[#ffba00] uppercase tracking-widest">🏆 Vencedores sorteados</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {sessao.vencedores.map((v, i) => {
              const pag = sessao.pagamentos.find(p => p.username === v.username);
              return (
                <div key={v.username} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,186,0,0.12)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }}>
                    {i + 1}
                  </span>
                  <Avatar image={v.image} name={v.displayName} size={9} />
                  <span className="flex-1 text-sm font-black text-white truncate">{v.displayName}</span>
                  {pag && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0"
                      style={pag.status === "enviado"
                        ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
                        : { background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                      {pag.status === "enviado" ? "PIX enviado ✓" : "Falhou"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de participantes */}
      {sessao.participantes.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex-1">Participantes</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black"
              style={{ background: "rgba(255,186,0,0.08)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.15)" }}>
              {sessao.participantes.length}
            </span>
          </div>
          <div className="divide-y divide-white/[0.03] overflow-y-auto" style={{ maxHeight: 280 }}>
            {sessao.participantes.map((p, i) => (
              <div key={p.username} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors">
                <span className="text-[10px] text-gray-700 w-5 text-right flex-shrink-0">{i + 1}</span>
                <Avatar image={p.image} name={p.displayName} size={7} />
                <span className="text-xs font-bold text-white truncate flex-1">{p.displayName}</span>
                {jaParticipa && p.username === cadastro?.username && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00" }}>você</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "pendente" | "aprovado" | "rejeitado" }) {
  const map = {
    pendente:  { label: "Aguardando aprovação", color: "#ffba00", bg: "rgba(255,186,0,0.1)",   border: "rgba(255,186,0,0.25)"  },
    aprovado:  { label: "Aprovado ✓",           color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)"  },
    rejeitado: { label: "Rejeitado",             color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)"  },
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
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Gorjeta</span>
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Gorjeta</h1>
          <p className="text-sm text-gray-500 mt-1">Receba PIX diretamente do streamer</p>
        </div>

        {/* Sessão ativa */}
        {sessao && <SessaoAoVivo sessao={sessao} cadastro={cadastro ?? null} />}

        {/* Sem sessão ativa — estado vazio */}
        {!sessao && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
              style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.15)" }}>
              <span className="text-4xl">💰</span>
            </div>
            <h2 className="text-lg font-black text-white mb-2">Nenhuma gorjeta ativa</h2>
            <p className="text-sm text-gray-500">Fique de olho! O streamer pode abrir uma gorjeta a qualquer momento.</p>
          </div>
        )}

        {/* Login necessário */}
        {status === "unauthenticated" && (
          <div className="rounded-2xl p-7 text-center"
            style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,186,0,0.12)", backdropFilter: "blur(12px)" }}>
            <p className="text-sm font-black text-white mb-1">Faça login para se cadastrar</p>
            <p className="text-xs text-gray-500 mb-5">Conecte sua conta Twitch para participar das gorjetas</p>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm text-black transition-all hover:scale-[1.04]"
              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
              Login com Twitch
            </Link>
          </div>
        )}

        {/* Formulário de cadastro */}
        {status === "authenticated" && cadastro === null && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,186,0,0.18)", backdropFilter: "blur(12px)" }}>
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-black text-white">Cadastro para gorjeta</h2>
              <p className="text-xs text-gray-500 mt-0.5">Preencha seus dados para receber PIX</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Nome Completo</label>
                <input type="text" placeholder="Seu nome como no banco"
                  value={form.nomeCompleto}
                  onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
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
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all hover:bg-white/[0.04]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                  {form.screenshot
                    ? <><span className="text-green-400 font-bold text-base">✓</span><span className="text-white text-xs truncate flex-1 text-left">{screenshotName}</span></>
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
                style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                {enviando ? "Enviando..." : "Enviar cadastro"}
              </button>
            </div>
          </div>
        )}

        {/* Status do cadastro */}
        {status === "authenticated" && cadastro && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,186,0,0.12)", backdropFilter: "blur(12px)" }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white">Seu cadastro</h2>
                <p className="text-xs text-gray-500 mt-0.5">{cadastro.nomeCompleto}</p>
              </div>
              <StatusBadge status={cadastro.status} />
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">CPF</p>
                  <p className="text-sm font-black text-white">{mascarCpf(cadastro.cpf)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Enviado em</p>
                  <p className="text-sm font-black text-white">{new Date(cadastro.criadoEm).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              {cadastro.status === "pendente" && (
                <div className="rounded-xl px-4 py-3 text-sm text-[#ffba00]"
                  style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.15)" }}>
                  ⏳ Aguardando aprovação. Quando aprovado, digite <strong>!gorjeta</strong> no chat durante uma sessão!
                </div>
              )}
              {cadastro.status === "aprovado" && (
                <div className="rounded-xl px-4 py-3 text-sm text-green-400"
                  style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  ✅ Aprovado! Quando houver gorjeta ativa, digite <strong className="text-white">!gorjeta</strong> no chat.
                </div>
              )}
              {cadastro.status === "rejeitado" && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3 text-sm text-red-400"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    ❌ Rejeitado{cadastro.motivoRejeicao ? `: ${cadastro.motivoRejeicao}` : "."}
                  </div>
                  <button onClick={() => setCadastro(null)}
                    className="w-full py-2.5 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                    Enviar novo cadastro
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Como funciona */}
        <div className="rounded-2xl px-5 py-4"
          style={{ background: "rgba(8,6,20,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-2">Como funciona</p>
          <ol className="space-y-1.5 text-sm text-gray-500">
            <li>1. Cadastre-se com seu nome completo e CPF (chave PIX)</li>
            <li>2. Aguarde a aprovação do admin</li>
            <li>3. Quando o streamer abrir uma gorjeta, digite <strong className="text-gray-400">!gorjeta</strong> no chat</li>
            <li>4. Se sorteado, o PIX é enviado automaticamente!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
