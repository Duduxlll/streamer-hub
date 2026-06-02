import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { NextResponse, type NextRequest } from "next/server";

// Cache das listas de bloqueio — persiste entre requests no mesmo processo (Render single instance)
let bannedIpsCache: Set<string>       = new Set();
let bannedLoginsCache: Map<string, number> = new Map(); // login → ate (0 = permanente; senão timestamp de fim da suspensão)
let cacheTs = 0;
const CACHE_TTL = 30_000; // 30s

async function refreshBlocklists(): Promise<void> {
  const dbUrl   = process.env.TURSO_DATABASE_URL;
  const dbToken = process.env.TURSO_AUTH_TOKEN;
  if (!dbUrl || !dbToken) return;

  try {
    const httpUrl = dbUrl.replace("libsql://", "https://").replace(/\/$/, "");
    const res = await fetch(`${httpUrl}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dbToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: "SELECT value FROM app_store WHERE key = ?", args: [{ type: "text", value: "admin:banned-ips:v1" }] } },
          { type: "execute", stmt: { sql: "SELECT value FROM app_store WHERE key = ?", args: [{ type: "text", value: "admin:banned-logins:v1" }] } },
          { type: "close" },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) return;
    const data = await res.json() as {
      results?: Array<{ response?: { result?: { rows?: Array<Array<{ value?: string }>> } } }>
    };
    const ipsRaw    = data.results?.[0]?.response?.result?.rows?.[0]?.[0]?.value;
    const loginsRaw = data.results?.[1]?.response?.result?.rows?.[0]?.[0]?.value;
    bannedIpsCache = ipsRaw ? new Set(JSON.parse(ipsRaw) as string[]) : new Set();
    const loginsArr = loginsRaw ? JSON.parse(loginsRaw) as { login: string; ate: number }[] : [];
    bannedLoginsCache = new Map(loginsArr.map(x => [x.login.toLowerCase(), x.ate]));
    cacheTs = Date.now();
  } catch { /* best-effort — nunca bloqueia o request por erro de rede */ }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}

export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;
  const twitchLogin  = (req.auth?.user as { twitchLogin?: string })?.twitchLogin;

  // Não verifica na própria página de banido nem em assets/auth (evita loop de redirect)
  const skipCheck =
    pathname === "/banido" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth");

  if (!skipCheck) {
    if (Date.now() - cacheTs > CACHE_TTL) {
      await refreshBlocklists();
    }

    // Admin nunca é bloqueado (evita auto-trancamento acidental)
    const ehAdmin = isAdmin(twitchLogin);

    if (!ehAdmin) {
      // 1) Bloqueio pela CONTA logada (banido ou suspenso) — funciona mesmo já estando logado.
      //    ate === 0 → ban permanente; ate > agora → suspensão ainda ativa (expira sozinha).
      if (twitchLogin) {
        const ate = bannedLoginsCache.get(twitchLogin.toLowerCase());
        if (ate !== undefined && (ate === 0 || ate > Date.now())) {
          return NextResponse.redirect(new URL("/banido", req.url));
        }
      }
      // 2) Bloqueio pelo IP (banidos)
      const ip = getClientIp(req);
      if (ip && bannedIpsCache.has(ip)) {
        return NextResponse.redirect(new URL("/banido", req.url));
      }
    }
  }

  // ── Proteção das rotas /admin ────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin(twitchLogin)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
