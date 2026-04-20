import fs from "fs";
import path from "path";

export interface JackpotJogador {
  id: string;
  nome: string;
  jogo: string;
  valor: number | null;
}

export interface Jackpot {
  id: string;
  nome: string;
  valorEntrada: number;
  status: "aguardando" | "ativo" | "finalizado";
  jogadores: JackpotJogador[];
  jogadorAtualIdx: number;
  vencedor: JackpotJogador | null;
  criadoEm: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __jackpot: Jackpot | null | undefined;
}

const FILE = path.join(process.cwd(), ".jackpot.json");

function loadFromFile(): Jackpot | null {
  try {
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, "utf-8");
      return JSON.parse(raw) as Jackpot;
    }
  } catch { /* ignora erro de leitura */ }
  return null;
}

function saveToFile(j: Jackpot | null): void {
  try {
    if (j === null) {
      if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
    } else {
      fs.writeFileSync(FILE, JSON.stringify(j), "utf-8");
    }
  } catch { /* ignora erro de escrita */ }
}

// Inicializa da memória ou do arquivo
if (globalThis.__jackpot === undefined) {
  globalThis.__jackpot = loadFromFile();
}

export function getJackpot(): Jackpot | null {
  return globalThis.__jackpot ?? null;
}

export function setJackpot(j: Jackpot | null): void {
  globalThis.__jackpot = j;
  saveToFile(j);
}
