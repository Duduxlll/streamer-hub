import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import {
  getBatalha, criarBatalha, iniciarBatalha,
  setJogo, setVencedor, finalizarBatalha, entrarBatalha,
  type VagasOptions,
} from "@/lib/batalhaStore";

export async function GET() {
  return NextResponse.json(getBatalha());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "criar") {
    const { nome, vagas, premiacao, comando } = body;
    if (!nome || !vagas || !comando) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }
    return NextResponse.json(criarBatalha(nome, vagas as VagasOptions, premiacao ?? 0, comando));
  }

  if (action === "iniciar") {
    const result = iniciarBatalha();
    if (!result.ok) return NextResponse.json({ error: result.motivo }, { status: 400 });
    return NextResponse.json(getBatalha());
  }

  if (action === "set-jogo") {
    const { roundIdx, matchIdx, slot, jogoNome, jogoValor } = body;
    setJogo(roundIdx, matchIdx, slot, jogoNome ?? "", jogoValor ?? 0);
    return NextResponse.json(getBatalha());
  }

  if (action === "set-vencedor") {
    const { roundIdx, matchIdx, winner } = body;
    const result = setVencedor(roundIdx, matchIdx, winner);
    if (!result.ok) return NextResponse.json({ error: "Não foi possível definir vencedor" }, { status: 400 });
    return NextResponse.json(getBatalha());
  }

  if (action === "finalizar") {
    finalizarBatalha();
    return NextResponse.json({ ok: true });
  }

  if (action === "add-test") {
    const count = Math.min(Number(body.count) || 8, 32);
    const nomes = ["Zeus","Ares","Hermes","Poseidon","Hades","Apollo","Artemis","Athena","Hephaestus","Dionysus","Eros","Nike","Iris","Tyche","Nemesis","Persephone","Demeter","Hestia","Hera","Kronos","Rhea","Gaia","Uranus","Chaos","Nyx","Erebus","Hemera","Aether","Chronos","Ananke","Phanes","Protogenos"];
    for (let i = 0; i < count; i++) {
      const n = nomes[i % nomes.length];
      entrarBatalha(n.toLowerCase(), n);
    }
    return NextResponse.json(getBatalha());
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
