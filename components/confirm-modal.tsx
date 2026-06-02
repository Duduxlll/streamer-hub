"use client";

import { useState, useCallback } from "react";

interface ConfirmState {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (message: string, opts?: { confirmLabel?: string; danger?: boolean }): Promise<boolean> =>
      new Promise(resolve => setState({ message, resolve, ...opts })),
    []
  );

  const handleOk = () => { state?.resolve(true);  setState(null); };
  const handleNo = () => { state?.resolve(false); setState(null); };

  const ConfirmModal = state ? (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", animation: "toast-in 200ms ease forwards" }}
      onClick={handleNo}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm"
        style={{
          background: "rgba(8,20,13,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 0 40px rgba(0,0,0,0.6), 0 16px 48px rgba(0,0,0,0.4)",
          animation: "toast-in 280ms cubic-bezier(0.34,1.3,0.64,1) forwards",
        }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-base font-bold text-white mb-6 leading-snug">{state.message}</p>

        <div className="flex gap-3">
          <button
            onClick={handleNo}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-gray-400 hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleOk}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={
              state.danger
                ? { background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.45)", color: "#f87171" }
                : { background: "linear-gradient(135deg, #ffba00, #e6a000)", color: "#000" }
            }
          >
            {state.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmModal };
}
