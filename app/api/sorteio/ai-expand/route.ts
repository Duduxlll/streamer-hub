import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isVerifiedAdminSession } from "@/lib/admin-identity";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pede pro Grok APENAS estender o fundo da imagem para um banner largo — sem inventar objetos.
const PROMPT =
  "Expand and extend this image into a wide horizontal banner. Only continue the existing " +
  "background outward to fill the new empty space on the left and right sides. Do NOT add, remove, " +
  "invent or change any object — keep the main subject exactly as it is, centered and untouched. " +
  "The extended background must blend seamlessly and look photorealistic. Final result must be an ultra-wide horizontal banner.";

function getGrokErrorMessage(status: number, text: string): string {
  let parsedMessage = "";
  try {
    const json = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (typeof json.message === "string") parsedMessage = json.message;
    else if (typeof json.error === "string") parsedMessage = json.error;
    else if (json.error && typeof json.error === "object" && "message" in json.error) {
      const message = (json.error as { message?: unknown }).message;
      if (typeof message === "string") parsedMessage = message;
    }
  } catch {
    parsedMessage = text;
  }

  const msg = parsedMessage || text;
  const lower = msg.toLowerCase();

  if (status === 401) return "Chave XAI_API_KEY inválida ou sem acesso. Gere uma nova chave na console da xAI e atualize no Render.";
  if (status === 403 && (lower.includes("credit") || lower.includes("license") || lower.includes("permission"))) {
    return "A conta/equipe da xAI ainda não tem créditos ou licença para gerar imagem. Adicione créditos na console.x.ai e tente novamente.";
  }
  if (status === 422 && lower.includes("aspect_ratio")) {
    return "O Grok recusou o formato da imagem. Use uma imagem comum e tente novamente.";
  }
  if (status === 429) return "A xAI limitou muitas tentativas agora. Espere um pouco e tente de novo.";
  if (status >= 500) return "A xAI ficou instável agora. Tente novamente em alguns instantes.";

  return `Grok recusou (${status}): ${msg.slice(0, 220)}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(await isVerifiedAdminSession(session))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const key = process.env.XAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "A chave XAI_API_KEY não está configurada no servidor." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const imagem = typeof body.imagem === "string" ? body.imagem : "";
  if (!imagem.startsWith("data:image/")) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }

  try {
    const r = await fetch("https://api.x.ai/v1/images/edits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "grok-imagine-image-quality",
        prompt: PROMPT,
        image: { url: imagem, type: "image_url" },
        aspect_ratio: "20:9",
        resolution: "2k",
        n: 1,
        response_format: "b64_json",
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: getGrokErrorMessage(r.status, text) }, { status: 502 });
    }

    let json: unknown;
    try { json = JSON.parse(text); } catch { return NextResponse.json({ error: "Resposta inválida do Grok." }, { status: 502 }); }

    const data = (json as { data?: Array<{ b64_json?: string; url?: string }> }).data?.[0] ?? {};
    let out = "";
    if (data.b64_json) {
      out = `data:image/jpeg;base64,${data.b64_json}`;
    } else if (data.url) {
      // Grok devolveu uma URL temporária — baixa e converte para data URL (para guardar no nosso banco)
      const img = await fetch(data.url);
      if (img.ok) {
        const buf = Buffer.from(await img.arrayBuffer());
        const ct = img.headers.get("content-type") || "image/jpeg";
        out = `data:${ct};base64,${buf.toString("base64")}`;
      }
    }

    if (!out) return NextResponse.json({ error: "O Grok não retornou uma imagem." }, { status: 502 });
    return NextResponse.json({ imagem: out });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao ajustar a imagem." }, { status: 500 });
  }
}
