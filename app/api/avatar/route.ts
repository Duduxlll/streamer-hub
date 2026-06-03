import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy de imagem de avatar — serve a foto da Twitch pela NOSSA origem,
// driblando o CORS (necessário para usar como textura no WebGL/3D).
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new NextResponse("missing url", { status: 400 });

  let url: URL;
  try { url = new URL(u); } catch { return new NextResponse("bad url", { status: 400 }); }

  // Só permite imagens da CDN da Twitch (evita uso como proxy aberto)
  if (!/(^|\.)jtvnw\.net$/.test(url.hostname)) {
    return new NextResponse("forbidden", { status: 403 });
  }

  try {
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) return new NextResponse("upstream error", { status: 502 });
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": r.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
