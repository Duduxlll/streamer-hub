"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthShell, AuthHeader, AuthField, AuthInput, AuthButton, AuthAlert, Icons } from "@/components/auth-ui";
import { JONBET_URL, JONBET_LOGO } from "@/lib/partner";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function formatCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function CadastroPage() {
  const { status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({ twitchLogin: "", nomeCompleto: "", cpf: "", email: "", senha: "", confirmar: "" });
  const [screenshot, setScreenshot] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [aceito, setAceito] = useState(false);
  const [modalComoFazer, setModalComoFazer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErro("Envie uma imagem (PNG, JPG, etc.)"); return; }
    if (file.size > MAX_SCREENSHOT_BYTES) { setErro("Imagem muito grande (máx 5MB)"); return; }
    setErro("");
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = e => setScreenshot(e.target?.result as string ?? "");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!form.twitchLogin.trim()) return setErro("Informe seu nome da Twitch");
    if (!/^[a-zA-Z0-9_]{3,25}$/.test(form.twitchLogin.trim())) return setErro("Nome da Twitch inválido (letras, números e _ )");
    if (form.nomeCompleto.trim().length < 3 || !form.nomeCompleto.trim().includes(" ")) return setErro("Informe seu nome completo (nome e sobrenome)");
    if (form.cpf.replace(/\D/g, "").length !== 11) return setErro("CPF incompleto");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErro("E-mail inválido");
    if (form.senha.length < 6) return setErro("A senha precisa ter no mínimo 6 caracteres");
    if (form.senha !== form.confirmar) return setErro("As senhas não coincidem");
    if (!screenshot) return setErro("Envie o print do seu histórico de depósito na JonBet");
    if (!aceito) return setErro("É preciso aceitar os Termos de Uso");

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitchLogin: form.twitchLogin.trim(), nomeCompleto: form.nomeCompleto.trim(),
          cpf: form.cpf, email: form.email.trim(), senha: form.senha, screenshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao cadastrar"); setLoading(false); return; }

      const login = await signIn("credentials", { email: form.email.trim(), password: form.senha, redirect: false });
      if (login?.error) { router.replace("/login"); return; }
      router.replace("/");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <AuthShell wide>
      <AuthHeader icon={Icons.user("w-7 h-7")} title="Criar conta" subtitle="Preencha seus dados para participar das gorjetas" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Nome da Twitch" delay={70}>
          <AuthInput type="text" autoCapitalize="none" autoCorrect="off" placeholder="seu_nome_na_twitch"
            icon={Icons.at()} value={form.twitchLogin} onChange={e => set("twitchLogin", e.target.value)} />
          <p className="text-[11px] text-gray-600 mt-1">Precisa ser o mesmo do chat. Identifica você e não pode ser repetido.</p>
        </AuthField>

        <AuthField label="Nome completo" delay={100}>
          <AuthInput type="text" placeholder="Seu nome como no banco"
            icon={Icons.user()} value={form.nomeCompleto} onChange={e => set("nomeCompleto", e.target.value)} />
        </AuthField>

        <AuthField label="CPF" delay={130}>
          <AuthInput type="text" inputMode="numeric" placeholder="000.000.000-00"
            icon={Icons.id()} value={form.cpf} onChange={e => set("cpf", formatCpf(e.target.value))} />
          <p className="text-[11px] text-gray-600 mt-1">Será usado como chave PIX para receber as gorjetas.</p>
        </AuthField>

        <AuthField label="E-mail" delay={160}>
          <AuthInput type="email" autoCapitalize="none" placeholder="voce@email.com"
            icon={Icons.mail()} value={form.email} onChange={e => set("email", e.target.value)} />
          <p className="text-[11px] text-gray-600 mt-1">Será seu login de acesso à plataforma.</p>
        </AuthField>

        <div className="grid grid-cols-2 gap-3">
          <AuthField label="Senha" delay={190}>
            <AuthInput type="password" placeholder="mín. 6" icon={Icons.lock()}
              value={form.senha} onChange={e => set("senha", e.target.value)} />
          </AuthField>
          <AuthField label="Confirmar" delay={210}>
            <AuthInput type="password" placeholder="repita" icon={Icons.lock()}
              value={form.confirmar} onChange={e => set("confirmar", e.target.value)} />
          </AuthField>
        </div>

        <AuthField label="Print do depósito na JonBet" delay={240}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="auth-dropzone">
            {screenshot ? (
              <>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>✓</span>
                <span className="text-white text-xs truncate flex-1 text-left">{screenshotName}</span>
                <span className="text-[11px] text-gray-500">trocar</span>
              </>
            ) : (
              <>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>{Icons.image("w-5 h-5")}</span>
                <span className="text-gray-400 text-sm flex-1 text-left">Clique para enviar o print</span>
              </>
            )}
          </button>
          {screenshot && (
            <div className="mt-2 rounded-xl overflow-hidden border border-white/5">
              <img src={screenshot} alt="preview" className="w-full max-h-40 object-cover" />
            </div>
          )}
        </AuthField>

        <button type="button" onClick={() => setModalComoFazer(true)}
          className="auth-fade flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl group transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ animationDelay: "258ms", background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.14)" }}>
          <div className="relative flex-shrink-0">
            <span className="absolute inset-0 rounded-full animate-ping opacity-50"
              style={{ background: "rgba(34,197,94,1)", animationDuration: "2.4s" }} />
            <div className="relative w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black"
              style={{ background: "linear-gradient(135deg,#4ade80,#22c55e)", boxShadow: "0 0 14px rgba(34,197,94,0.55), 0 0 4px rgba(34,197,94,0.9)" }}>
              ?
            </div>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[12px] font-black text-gray-300 group-hover:text-white transition-colors leading-tight">
              Onde encontrar o histórico de depósitos?
            </p>
            <p className="text-[10px] text-gray-600 group-hover:text-[#4ade80] transition-colors mt-0.5">
              JonBet · Clique para ver o passo a passo
            </p>
          </div>
          <svg className="w-4 h-4 text-gray-600 group-hover:text-[#4ade80] transition-all group-hover:translate-x-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <label className="auth-fade flex items-start gap-2.5 cursor-pointer select-none" style={{ animationDelay: "270ms" }}>
          <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#22c55e] flex-shrink-0" />
          <span className="text-[12px] text-gray-500 leading-relaxed">
            Li e aceito os <Link href="/termos" className="text-[#4ade80] hover:underline">Termos de Uso</Link> e a{" "}
            <Link href="/privacidade" className="text-[#4ade80] hover:underline">Política de Privacidade</Link>.
          </span>
        </label>

        {erro && <AuthAlert>{erro}</AuthAlert>}

        <div className="auth-fade pt-1" style={{ animationDelay: "300ms" }}>
          <AuthButton type="submit" loading={loading}>Criar conta →</AuthButton>
        </div>
      </form>

      <div className="auth-fade text-center mt-5 pt-5 border-t border-white/5" style={{ animationDelay: "330ms" }}>
        <p className="text-sm text-gray-500">
          Já tem conta? <Link href="/login" className="text-[#4ade80] font-bold hover:underline">Entrar</Link>
        </p>
      </div>

      {modalComoFazer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(16px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalComoFazer(false); }}>
          <style>{`
            @keyframes jbUp    { from { opacity:0; transform:translateY(56px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes jbStep  { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
            @keyframes jbShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
          `}</style>

          <div className="relative w-full sm:max-w-[380px] sm:mx-4 rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(170deg, rgba(5,20,10,1) 0%, rgba(2,11,5,1) 100%)",
              border: "1px solid rgba(34,197,94,0.2)",
              boxShadow: "0 -8px 80px rgba(34,197,94,0.18), 0 0 0 1px rgba(34,197,94,0.04)",
              animation: "jbUp 0.42s cubic-bezier(0.16,1,0.3,1) both",
              maxHeight: "90dvh",
            }}>

            {/* animated top glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.9) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "jbShimmer 3s linear infinite",
              }} />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-10 pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(34,197,94,0.35), transparent 70%)", filter: "blur(16px)" }} />

            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-9 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>

            {/* header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3.5 flex-shrink-0">
              <div>
                <p className="text-[15px] font-black text-white tracking-tight leading-tight">
                  Onde encontrar o histórico?
                </p>
                <p className="text-[11px] font-bold mt-0.5" style={{ color: "rgba(74,222,128,0.55)" }}>
                  JonBet · Passo a passo
                </p>
              </div>
              <button type="button" onClick={() => setModalComoFazer(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/8 hover:scale-110 active:scale-95 text-gray-600 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="h-px mx-5 flex-shrink-0" style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.1), transparent)" }} />

            {/* timeline */}
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0" style={{ scrollbarWidth: "none" }}>
              {([
                {
                  label: "Acesse a JonBet pelo link do Stainzin",
                  desc: "Use o botão verde abaixo — isso vincula seu cadastro ao canal do Stainzin.",
                },
                {
                  label: 'Clique em "Cadastre-se"',
                  desc: <>No <strong className="text-gray-200">canto superior direito</strong> da JonBet, crie sua conta.</>,
                },
                {
                  label: "Faça um depósito",
                  desc: "Realize um depósito para que o histórico apareça na plataforma.",
                },
                {
                  label: "Clique no ícone da sua conta",
                  desc: "Após fazer login, clique no ícone do perfil no canto superior.",
                },
                {
                  label: 'Vá em "Transações"',
                  desc: <>No menu que abrir, selecione <strong className="text-gray-200">"Transações"</strong>.</>,
                },
                {
                  label: 'Clique em "Depósitos"',
                  desc: <>Na aba <strong className="text-gray-200">"Depósitos"</strong>, seus depósitos aparecerão listados com datas e valores.</>,
                },
                {
                  label: "Tire o print e envie aqui",
                  desc: "Capture a tela mostrando os depósitos e envie no campo acima. Pronto!",
                },
              ] as { label: string; desc: React.ReactNode }[]).map((step, idx, arr) => (
                <div key={idx} className="flex gap-3"
                  style={{ animation: `jbStep 0.35s cubic-bezier(0.22,1,0.36,1) ${60 + idx * 55}ms both` }}>
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 26 }}>
                    <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-all"
                      style={{
                        background: idx === 0 || idx === arr.length - 1
                          ? "linear-gradient(135deg,#4ade80,#22c55e)"
                          : "rgba(34,197,94,0.12)",
                        color: idx === 0 || idx === arr.length - 1 ? "#000" : "#4ade80",
                        border: idx === 0 || idx === arr.length - 1 ? "none" : "1px solid rgba(34,197,94,0.25)",
                        boxShadow: idx === 0
                          ? "0 0 16px rgba(34,197,94,0.5), 0 0 6px rgba(34,197,94,0.8)"
                          : idx === arr.length - 1
                          ? "0 0 10px rgba(34,197,94,0.35)"
                          : "none",
                      }}>
                      {idx + 1}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="w-px flex-1 my-1"
                        style={{ background: "linear-gradient(180deg,rgba(34,197,94,0.3) 0%,rgba(34,197,94,0.04) 100%)", minHeight: 18 }} />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-[12px] font-black text-white leading-tight mb-0.5">{step.label}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(156,163,175,0.8)" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* footer button */}
            <div className="px-5 pb-7 pt-1 flex-shrink-0">
              <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.1), transparent)" }} />
              <a
                href={JONBET_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setModalComoFazer(false)}
                className="relative flex items-center gap-3 w-full px-4 py-3 rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 28px rgba(34,197,94,0.45)" }}>
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
                    backgroundSize: "200% 100%",
                    animation: "jbShimmer 2.5s linear infinite",
                  }} />
                <img src={JONBET_LOGO} alt="JonBet" className="relative h-5 w-auto object-contain flex-shrink-0" />
                <div className="relative w-px h-5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }} />
                <span className="relative font-black text-sm text-white flex-1">Ir para a JonBet agora</span>
                <span className="relative text-white/60 font-bold">→</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
