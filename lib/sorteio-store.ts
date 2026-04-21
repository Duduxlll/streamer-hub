import { dbGet, dbSet } from "./store";

export interface Participante {
  username: string;
  displayName: string;
  image: string | null;
  tickets: number;
}

export interface Sorteio {
  id: string;
  titulo: string;
  valor: string;
  minutosTicket: number;
  duracaoMs: number;
  iniciadoEm: number;
  status: "ativo" | "pronto" | "finalizado" | "cancelado";
  participantes: Participante[];
  vencedor: Participante | null;
}

const KEY = "streamer-hub:sorteio:v1";

declare global {
  var __sorteioFallback: Sorteio[] | undefined;
}

function applyExpiry(list: Sorteio[]): Sorteio[] {
  const now = Date.now();
  for (const s of list) {
    if (s.status === "ativo" && now >= s.iniciadoEm + s.duracaoMs) {
      s.status = "pronto";
    }
  }
  return list;
}

async function load(): Promise<Sorteio[]> {
  try {
    const raw = await dbGet(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return applyExpiry(Array.isArray(parsed) ? parsed : []);
    }
  } catch {}
  return applyExpiry(globalThis.__sorteioFallback ?? []);
}

async function persist(list: Sorteio[]): Promise<void> {
  const trimmed = list.slice(0, 20);
  globalThis.__sorteioFallback = trimmed;
  try {
    await dbSet(KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getAtivo(list: Sorteio[]): Sorteio | null {
  return list.find(s => s.status === "ativo" || s.status === "pronto") ?? null;
}

export async function getSorteios(): Promise<Sorteio[]> {
  return load();
}

export async function criarSorteio(params: {
  titulo: string;
  valor: string;
  minutosTicket: number;
  duracaoMinutos: number;
}): Promise<Sorteio> {
  const list = await load();
  const s: Sorteio = {
    id: Date.now().toString(),
    titulo: params.titulo,
    valor: params.valor,
    minutosTicket: Math.max(1, params.minutosTicket),
    duracaoMs: Math.max(60_000, params.duracaoMinutos * 60_000),
    iniciadoEm: Date.now(),
    status: "ativo",
    participantes: [],
    vencedor: null,
  };
  await persist([s, ...list]);
  return s;
}

export async function participarSorteio(
  username: string,
  displayName: string,
  image: string | null,
): Promise<{ sorteio: Sorteio; jaParticipa: boolean } | { error: string }> {
  const list = await load();
  const s = getAtivo(list);
  if (!s) return { error: "Sem sorteio ativo" };

  const jaParticipa = s.participantes.some(
    p => p.username.toLowerCase() === username.toLowerCase(),
  );
  if (jaParticipa) return { sorteio: s, jaParticipa: true };

  s.participantes.push({ username, displayName, image, tickets: 1 });
  await persist(list);
  return { sorteio: s, jaParticipa: false };
}

export async function addTicket(
  username: string,
  displayName: string,
  image: string | null,
): Promise<boolean> {
  const list = await load();
  const s = getAtivo(list);
  if (!s || s.status !== "ativo") return false;

  const ex = s.participantes.find(
    p => p.username.toLowerCase() === username.toLowerCase(),
  );
  if (ex) {
    ex.tickets += 1;
  } else {
    s.participantes.push({ username, displayName, image, tickets: 1 });
  }
  await persist(list);
  return true;
}

export async function realizarSorteio(id: string): Promise<Sorteio | { error: string }> {
  const list = await load();
  const s = list.find(x => x.id === id) ?? getAtivo(list);
  if (!s) return { error: "Sorteio não encontrado" };
  if (s.status === "finalizado") return s;
  if (s.participantes.length === 0) return { error: "Sem participantes" };

  const pool: Participante[] = [];
  for (const p of s.participantes) {
    for (let i = 0; i < Math.max(p.tickets, 1); i++) pool.push(p);
  }
  s.vencedor = pool[Math.floor(Math.random() * pool.length)];
  s.status = "finalizado";
  await persist(list);
  return s;
}

export async function cancelarSorteio(id: string | null): Promise<void> {
  const list = await load();
  await persist(id ? list.filter(s => s.id !== id) : []);
}
