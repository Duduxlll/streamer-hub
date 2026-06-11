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

        <div className="auth-fade relative overflow-hidden rounded-xl" style={{ animationDelay: "255ms", border: "1px solid rgba(34,197,94,0.22)", background: "linear-gradient(135deg, rgba(4,18,8,0.97), rgba(2,12,5,0.97))", boxShadow: "0 2px 20px rgba(34,197,94,0.07)" }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.5), transparent)" }} />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <span className="text-sm">🎰</span>
              </div>
              <p className="text-[11px] font-black text-[#4ade80] leading-tight pt-0.5">
                Obrigatório para ter seu print de depósito aprovado na gorjeta
              </p>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Para ter seu cadastro aprovado, você precisa ter se cadastrado na JonBet
              pelo <strong className="text-gray-300">link do Stainzin</strong> e enviar o print do depósito acima.
            </p>
            <a
              href={JONBET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg,#ffe55a,#ffba00)", boxShadow: "0 3px 14px rgba(255,186,0,0.32)" }}>
              <img src={JONBET_LOGO} alt="JonBet" className="h-5 w-auto object-contain flex-shrink-0"
                style={{ filter: "brightness(0)" }} />
              <div className="w-px h-5 flex-shrink-0" style={{ background: "rgba(0,0,0,0.2)" }} />
              <span className="font-black text-sm text-black flex-1">Cadastre-se aqui</span>
              <span className="text-black/50 text-sm font-bold">→</span>
            </a>
          </div>
        </div>

        <button type="button" onClick={() => setModalComoFazer(true)}
          className="auth-fade flex items-center gap-2.5 w-full py-0.5 group"
          style={{ animationDelay: "260ms" }}>
          <div className="relative flex-shrink-0">
            <span className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(34,197,94,0.35)", animationDuration: "2s" }} />
            <div className="relative w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black text-black"
              style={{ background: "linear-gradient(135deg,#4ade80,#22c55e)", boxShadow: "0 0 10px rgba(34,197,94,0.55)" }}>
              ?
            </div>
          </div>
          <span className="text-[11px] text-gray-500 group-hover:text-[#4ade80] transition-colors leading-tight">
            Onde encontrar o histórico de depósitos na JonBet?
          </span>
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
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalComoFazer(false); }}>
          <style>{`
            @keyframes jbSlideUp  { from { opacity:0; transform:translateY(60px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes jbFadeIn   { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
            @keyframes jbStepIn   { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
          `}</style>

          <div className="relative w-full sm:max-w-[380px] sm:mx-4 rounded-t-3xl sm:rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(5,18,9,1) 0%, rgba(2,10,4,1) 100%)",
              border: "1px solid rgba(34,197,94,0.18)",
              boxShadow: "0 -4px 60px rgba(34,197,94,0.14), 0 0 0 1px rgba(34,197,94,0.05)",
              animation: "jbSlideUp 0.38s cubic-bezier(0.22,1,0.36,1) both",
            }}>

            {/* top glow line */}
            <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.7) 50%, transparent 100%)" }} />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 pointer-events-none opacity-40"
              style={{ background: "radial-gradient(ellipse, rgba(34,197,94,0.9), transparent 70%)", filter: "blur(18px)" }} />

            {/* drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden">
              <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <p className="text-base font-black text-white tracking-tight">Onde encontrar o histórico?</p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: "rgba(74,222,128,0.6)" }}>
                  JonBet · Passo a passo
                </p>
              </div>
              <button type="button" onClick={() => setModalComoFazer(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 text-gray-500 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="h-px mx-5" style={{ background: "rgba(34,197,94,0.08)" }} />

            {/* timeline steps */}
            <div className="px-5 py-4">
              {([
                {
                  label: "Acesse pelo link do Stainzin",
                  desc: "Abra a JonBet pelo botão dourado abaixo — isso vincula seu cadastro ao canal.",
                },
                {
                  label: 'Clique em "Cadastre-se"',
                  desc: <>No canto <strong className="text-gray-200">superior direito</strong> da JonBet, crie sua conta.</>,
                },
                {
                  label: "Faça um depósito",
                  desc: "Realize um depósito para liberar o histórico na plataforma.",
                },
                {
                  label: "Clique no ícone da sua conta",
                  desc: "Após fazer login, clique no ícone do perfil no canto superior da tela.",
                },
                {
                  label: 'Vá em "Transações"',
                  desc: <>No menu que abrir, selecione <strong className="text-gray-200">"Transações"</strong>.</>,
                },
                {
                  label: 'Selecione "Depósitos"',
                  desc: <>Clique na aba <strong className="text-gray-200">"Depósitos"</strong> — seus depósitos aparecerão listados.</>,
                },
                {
                  label: "Tire o print e envie aqui",
                  desc: "Capture a tela mostrando datas e valores dos depósitos, e envie no campo acima.",
                },
              ] as { label: string; desc: React.ReactNode }[]).map((step, idx, arr) => (
                <div key={idx} className="flex gap-3.5"
                  style={{ animation: `jbStepIn 0.3s ease-out ${80 + idx * 45}ms both` }}>
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 24 }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black flex-shrink-0"
                      style={{
                        background: idx === 0
                          ? "linear-gradient(135deg,#4ade80,#22c55e)"
                          : idx === arr.length - 1
                          ? "linear-gradient(135deg,#4ade80,#22c55e)"
                          : "rgba(34,197,94,0.15)",
                        color: idx === 0 || idx === arr.length - 1 ? "#000" : "#4ade80",
                        border: idx === 0 || idx === arr.length - 1 ? "none" : "1px solid rgba(34,197,94,0.3)",
                        boxShadow: idx === 0 ? "0 0 12px rgba(34,197,94,0.4)" : "none",
                      }}>
                      {idx + 1}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="w-px flex-1 my-1.5" style={{ background: "linear-gradient(180deg,rgba(34,197,94,0.25) 0%,rgba(34,197,94,0.05) 100%)", minHeight: 16 }} />
                    )}
                  </div>
                  <div className="flex-1 pb-3.5">
                    <p className="text-[12px] font-black text-white leading-tight mb-0.5">{step.label}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="px-5 pb-7 pt-1">
              <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }} />
              <a
                href={JONBET_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setModalComoFazer(false)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: "linear-gradient(135deg,#ffe55a,#ffba00)", boxShadow: "0 4px 24px rgba(255,186,0,0.42)" }}>
                <img src={JONBET_LOGO} alt="JonBet" className="h-5 w-auto object-contain flex-shrink-0"
                  style={{ filter: "brightness(0)" }} />
                <div className="w-px h-5 flex-shrink-0" style={{ background: "rgba(0,0,0,0.2)" }} />
                <span className="font-black text-sm text-black flex-1">Ir para a JonBet agora</span>
                <span className="text-black/50 font-bold">→</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
