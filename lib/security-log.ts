import { dbGet, dbSet } from "./store";

export type LogAction =
  | "admin_login"
  | "cadastro" | "reset_senha"
  | "ban" | "unban" | "suspend" | "unsuspend"
  | "config_livepix" | "config_ggpix"
  | "gorjeta_abrir" | "gorjeta_fechar" | "gorjeta_pagar"
  | "acesso_negado";

export interface LogEntry {
  id: string;
  ts: number;
  admin: string;
  action: LogAction | string;
  target?: string;
  detail?: string;
}

const KEY_LOGS = "admin:security-logs:v1";
const MAX_LOGS = 500;

export async function getLogs(): Promise<LogEntry[]> {
  try {
    const raw = await dbGet(KEY_LOGS);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch { return []; }
}

export async function addLog(entry: Omit<LogEntry, "id" | "ts">): Promise<void> {
  try {
    const logs = await getLogs();
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      ...entry,
    };
    await dbSet(KEY_LOGS, JSON.stringify([newEntry, ...logs].slice(0, MAX_LOGS)));
  } catch { /* best-effort — log nunca deve quebrar a operação principal */ }
}
