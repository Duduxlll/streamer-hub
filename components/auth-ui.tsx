"use client";

import type { ReactNode, InputHTMLAttributes } from "react";


const ic = "w-[18px] h-[18px]";
export const Icons = {
  login: (c?: string) => (
    <svg className={c ?? "w-7 h-7"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
  mail: (c = ic) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  lock: (c = ic) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  at: (c = ic) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  ),
  user: (c = ic) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  id: (c = ic) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M14 10h4M14 14h4M6 16.5c.5-1.2 3.5-1.2 4 0" />
    </svg>
  ),
  key: (c = "w-7 h-7") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  shield: (c = "w-7 h-7") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  ),
  check: (c = "w-8 h-8") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  image: (c = "w-6 h-6") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </svg>
  ),
};


export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth-page relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-bg-glow auth-bg-glow-a" />
        <div className="auth-bg-glow auth-bg-glow-b" />
        <div className="auth-grid" />
      </div>

      <div className={`relative w-full ${wide ? "max-w-md" : "max-w-sm"}`}>
        <div className="auth-card-wrap relative">
          <div aria-hidden className="auth-halo" />
          <div className="auth-card relative rounded-[26px] overflow-hidden">
            <div aria-hidden className="auth-topbar" />
            <div aria-hidden className="auth-shine" />
            <div className="relative z-10 p-7 sm:p-8">{children}</div>
          </div>
        </div>
        <p className="text-center text-[11px] text-gray-600 mt-5 tracking-wide flex items-center justify-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-green-500/60" /> +18 · Jogue com responsabilidade
        </p>
      </div>

      <style>{AUTH_CSS}</style>
    </div>
  );
}

export function AuthHeader({ icon, title, subtitle }: { icon: ReactNode; title: ReactNode; subtitle: string }) {
  return (
    <div className="text-center mb-7 auth-fade" style={{ animationDelay: "40ms" }}>
      <div className="auth-icon mx-auto mb-5">
        <span aria-hidden className="auth-icon-ring" />
        <span aria-hidden className="auth-icon-ring auth-icon-ring-2" />
        <div className="auth-icon-inner">{icon}</div>
      </div>
      <h1 className="auth-title">{title}</h1>
      <p className="text-gray-500 text-sm mt-2">{subtitle}</p>
    </div>
  );
}



export function AuthField({ label, right, children, delay = 0 }: {
  label: string; right?: ReactNode; children: ReactNode; delay?: number;
}) {
  return (
    <div className="auth-fade" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="auth-label">{label}</label>
        {right}
      </div>
      {children}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; right?: ReactNode };

export function AuthInput({ icon, right, className = "", ...props }: InputProps) {
  return (
    <div className="auth-input-wrap">
      {icon && <span className="auth-input-icon">{icon}</span>}
      <input {...props} className={`auth-input ${icon ? "pl-11" : "pl-4"} ${right ? "pr-14" : "pr-4"} ${className}`} />
      {right && <span className="auth-input-right">{right}</span>}
    </div>
  );
}

export function AuthButton({ loading, children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...props} disabled={loading || props.disabled} className={`auth-btn ${className}`}>
      <span aria-hidden className="auth-btn-shine" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? <span className="auth-spin" /> : children}
      </span>
    </button>
  );
}

export function AuthAlert({ kind = "error", children }: { kind?: "error" | "info" | "success"; children: ReactNode }) {
  const map = {
    error:   { bg: "rgba(248,113,113,0.08)", bd: "rgba(248,113,113,0.25)", fg: "#fca5a5", icon: "⚠️" },
    info:    { bg: "rgba(34,197,94,0.08)",   bd: "rgba(34,197,94,0.25)",   fg: "#86efac", icon: "✉️" },
    success: { bg: "rgba(34,197,94,0.1)",    bd: "rgba(34,197,94,0.3)",    fg: "#86efac", icon: "✅" },
  }[kind];
  return (
    <div className="auth-fade flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold leading-snug"
      style={{ background: map.bg, border: `1px solid ${map.bd}`, color: map.fg }}>
      <span className="mt-px">{map.icon}</span>
      <span>{children}</span>
    </div>
  );
}

export function AuthDivider() {
  return <div className="my-5 h-px w-full" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)" }} />;
}



const AUTH_CSS = `
@keyframes authFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes authFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
@keyframes authHalo { 0%,100% { opacity:.55; transform:scale(1); } 50% { opacity:.9; transform:scale(1.04); } }
@keyframes authRing { 0% { transform:scale(1); opacity:.6; } 100% { transform:scale(2.1); opacity:0; } }
@keyframes authShimmer { 0% { background-position:-180% 0; } 100% { background-position:180% 0; } }
@keyframes authShine { 0% { transform:translateX(-120%) skewX(-18deg); } 60%,100% { transform:translateX(220%) skewX(-18deg); } }
@keyframes authDrift1 { 0%,100% { transform:translate(0,0); } 50% { transform:translate(40px,30px); } }
@keyframes authDrift2 { 0%,100% { transform:translate(0,0); } 50% { transform:translate(-50px,-20px); } }
@keyframes authSpin { to { transform:rotate(360deg); } }
@keyframes authPopCheck { 0% { transform:scale(0) rotate(-12deg); opacity:0; } 60% { transform:scale(1.12) rotate(3deg); } 100% { transform:scale(1) rotate(0); opacity:1; } }

.auth-fade { animation: authFadeUp .5s cubic-bezier(.22,1,.36,1) both; }

.auth-bg-glow { position:absolute; border-radius:9999px; filter:blur(90px); }
.auth-bg-glow-a { width:520px; height:520px; top:-160px; left:-120px; background:radial-gradient(circle,rgba(34,197,94,.16),transparent 70%); animation: authDrift1 16s ease-in-out infinite; }
.auth-bg-glow-b { width:460px; height:460px; bottom:-180px; right:-120px; background:radial-gradient(circle,rgba(22,163,74,.14),transparent 70%); animation: authDrift2 18s ease-in-out infinite; }
.auth-grid { position:absolute; inset:0; opacity:.5;
  background-image:linear-gradient(rgba(34,197,94,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,.04) 1px,transparent 1px);
  background-size:44px 44px; mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,#000,transparent 75%); }

.auth-card-wrap { animation: authFadeUp .55s cubic-bezier(.22,1,.36,1) both; }
.auth-halo { position:absolute; inset:-2px; border-radius:28px; z-index:0;
  background:linear-gradient(140deg,rgba(34,197,94,.55),rgba(74,222,128,.15) 40%,rgba(22,163,74,.45));
  filter:blur(16px); animation: authHalo 4.5s ease-in-out infinite; }
.auth-card { background:linear-gradient(165deg,rgba(10,24,16,.92),rgba(5,14,9,.96));
  border:1px solid rgba(34,197,94,.22); backdrop-filter:blur(22px);
  box-shadow:0 30px 80px -20px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.04); }
.auth-topbar { position:absolute; top:0; left:0; right:0; height:3px; z-index:5;
  background:linear-gradient(90deg,rgba(34,197,94,0),#22c55e,#86efac,#16a34a,rgba(34,197,94,0));
  background-size:200% 100%; animation: authShimmer 3.5s linear infinite; }
.auth-shine { position:absolute; top:0; bottom:0; left:0; width:45%; z-index:6; pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
  animation: authShine 6s ease-in-out infinite 1.2s; }

.auth-icon { position:relative; width:68px; height:68px; }
.auth-icon-inner { position:relative; z-index:2; width:68px; height:68px; border-radius:20px; color:#fff;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(135deg,#22c55e,#16a34a); border:1px solid rgba(134,239,172,.4);
  box-shadow:0 12px 30px -6px rgba(34,197,94,.6), inset 0 1px 0 rgba(255,255,255,.25);
  animation: authFloat 4s ease-in-out infinite; }
.auth-icon-ring { position:absolute; inset:0; border-radius:20px; border:1.5px solid rgba(34,197,94,.5); animation: authRing 2.6s ease-out infinite; }
.auth-icon-ring-2 { animation-delay:1.3s; }

.auth-title { font-size:1.6rem; line-height:1.1; font-weight:900; letter-spacing:-.01em;
  background:linear-gradient(120deg,#fff 30%,#86efac); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

.auth-label { font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:#5b6b62; }

.auth-input-wrap { position:relative; }
.auth-input-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#4b9e6b; pointer-events:none; transition:color .2s; }
.auth-input-right { position:absolute; right:6px; top:50%; transform:translateY(-50%); }
.auth-input { width:100%; padding-top:.7rem; padding-bottom:.7rem; border-radius:14px; font-size:.92rem; color:#fff;
  background:rgba(255,255,255,.035); border:1px solid rgba(255,255,255,.09); outline:none;
  transition:border-color .2s, box-shadow .2s, background .2s; }
.auth-input::placeholder { color:#46514a; }
.auth-input:focus { border-color:rgba(34,197,94,.6); background:rgba(34,197,94,.05); box-shadow:0 0 0 3px rgba(34,197,94,.13); }
.auth-input-wrap:focus-within .auth-input-icon { color:#4ade80; }

.auth-btn { position:relative; width:100%; overflow:hidden; padding:.95rem 1rem; border-radius:14px; font-weight:900; font-size:1rem; color:#fff;
  background:linear-gradient(135deg,#22c55e,#16a34a); border:1px solid rgba(134,239,172,.35);
  box-shadow:0 12px 26px -8px rgba(34,197,94,.55), inset 0 1px 0 rgba(255,255,255,.25);
  cursor:pointer; transition:transform .15s, box-shadow .2s, filter .2s; }
.auth-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 16px 34px -8px rgba(34,197,94,.7); filter:brightness(1.05); }
.auth-btn:active:not(:disabled) { transform:translateY(0) scale(.99); }
.auth-btn:disabled { opacity:.6; cursor:not-allowed; }
.auth-btn-shine { position:absolute; top:0; bottom:0; left:0; width:40%; transform:translateX(-150%) skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent); }
.auth-btn:hover:not(:disabled) .auth-btn-shine { animation: authShine 1s ease; }

.auth-spin { width:20px; height:20px; border-radius:9999px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; animation: authSpin .7s linear infinite; }

.auth-success-check { width:76px; height:76px; border-radius:22px; margin:0 auto; display:flex; align-items:center; justify-content:center; color:#4ade80;
  background:rgba(34,197,94,.12); border:1px solid rgba(34,197,94,.35); box-shadow:0 0 36px rgba(34,197,94,.25);
  animation: authPopCheck .6s cubic-bezier(.34,1.56,.64,1) both; }

.auth-dropzone { width:100%; border-radius:14px; padding:.9rem 1rem; display:flex; align-items:center; gap:.75rem; cursor:pointer;
  background:rgba(255,255,255,.025); border:1.5px dashed rgba(34,197,94,.3); transition:background .2s, border-color .2s; }
.auth-dropzone:hover { background:rgba(34,197,94,.05); border-color:rgba(34,197,94,.5); }
.auth-code-input { text-align:center; letter-spacing:.55em; font-size:1.4rem; font-weight:900; padding-left:.55em; }
`;
