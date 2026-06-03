// Rate limiter simples em memória (janela deslizante).
// Suficiente para uma única instância (Render). Reinicia a cada deploy — é uma
// primeira barreira contra força-bruta/abuso, não um controle distribuído.

const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter(t => now - t < windowMs);

  if (arr.length >= max) {
    hits.set(key, arr);
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - arr[0])) / 1000));
    return { ok: false, retryAfter };
  }

  arr.push(now);
  hits.set(key, arr);

  // Limpeza ocasional para não crescer indefinidamente
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t > windowMs)) hits.delete(k);
    }
  }
  return { ok: true, retryAfter: 0 };
}

export function ipFromHeaders(h: Headers): string {
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconhecido"
  );
}
