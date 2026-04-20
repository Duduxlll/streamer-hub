"use client";

import { useEffect, useState } from "react";

interface StreamData {
  isLive: boolean;
  viewerCount?: number;
  title?: string;
  gameName?: string;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function TwitchStatus() {
  const [data, setData] = useState<StreamData | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/twitch", { cache: "no-store" });
      setData(await res.json());
    } catch {
      setData({ isLive: false });
    }
  }

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, []);

  /* loading */
  if (!data) {
    return (
      <div className="flex items-center gap-1.5 bg-[#070f1f] border border-[#1d4ed8]/30 rounded-full px-4 py-1.5 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">carregando</span>
      </div>
    );
  }

  /* ao vivo */
  if (data.isLive) {
    return (
      <div className="flex items-center gap-2 bg-[#070f1f] border border-red-500/50 rounded-full px-4 py-1.5 shadow-lg shadow-red-950/40 whitespace-nowrap">
        <span className="live-dot w-2 h-2 rounded-full bg-red-500" style={{ background: "#ef4444" }} />
        <span className="text-xs font-black text-red-400 uppercase tracking-widest">Ao Vivo</span>
        {data.viewerCount !== undefined && (
          <>
            <span className="text-gray-600 text-[10px]">·</span>
            <span className="text-xs font-bold text-white">
              {formatViewers(data.viewerCount)}
            </span>
            <span className="text-[10px] text-gray-500">viewers</span>
          </>
        )}
      </div>
    );
  }

  /* offline */
  return (
    <div className="flex items-center gap-1.5 bg-[#070f1f] border border-white/8 rounded-full px-4 py-1.5 whitespace-nowrap">
      <span className="w-2 h-2 rounded-full bg-gray-600" />
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Offline</span>
    </div>
  );
}
