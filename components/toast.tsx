"use client";

import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  removing?: boolean;
}

const DURATION = 3500;
const EXIT_MS  = 320;

let _id = 0;

const CFG: Record<ToastType, { icon: string; color: string; border: string; glow: string }> = {
  success: { icon: "✅", color: "#22c55e", border: "rgba(34,197,94,0.35)",  glow: "rgba(34,197,94,0.15)"  },
  error:   { icon: "❌", color: "#ef4444", border: "rgba(239,68,68,0.35)",  glow: "rgba(239,68,68,0.15)"  },
  warning: { icon: "⚠️", color: "#ffba00", border: "rgba(255,186,0,0.35)",  glow: "rgba(255,186,0,0.15)"  },
  info:    { icon: "💬", color: "#4ade80", border: "rgba(74,222,128,0.35)", glow: "rgba(74,222,128,0.15)" },
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), EXIT_MS);
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    const timer = setTimeout(() => dismiss(id), DURATION);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return { toasts, toast, dismiss };
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const cfg = CFG[item.type];
  return (
    <div
      onClick={() => onDismiss(item.id)}
      className="relative flex items-start gap-3 px-4 py-3.5 rounded-2xl cursor-pointer select-none overflow-hidden"
      style={{
        background: "rgba(8,20,13,0.96)",
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 24px ${cfg.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
        backdropFilter: "blur(16px)",
        animation: item.removing
          ? `toast-out ${EXIT_MS}ms cubic-bezier(0.4,0,1,1) forwards`
          : "toast-in 420ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        maxWidth: 360,
        minWidth: 240,
      }}
    >
      <span
        className="absolute bottom-0 left-0 h-[2px] rounded-full"
        style={{
          background: cfg.color,
          animation: item.removing ? "none" : `toast-progress ${DURATION}ms linear forwards`,
          opacity: 0.7,
        }}
      />

      <span className="text-base flex-shrink-0 mt-0.5">{cfg.icon}</span>
      <span className="text-sm font-semibold leading-snug" style={{ color: "#e5e7eb" }}>
        {item.message}
      </span>
      <span className="ml-auto flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors text-xs pl-2 mt-0.5">
        ✕
      </span>
    </div>
  );
}

export function ToastContainer({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard item={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
