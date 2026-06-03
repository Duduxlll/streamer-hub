"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/admins";

// ── Geometria: queda vertical vista de FRENTE (tipo Pachinko/Plinko 3D) ──────
const LANE_W   = 16;
const WALL_X   = LANE_W / 2;
const TOP_Y    = 9;
const FALL     = 70;
const FINISH_Y = TOP_Y - FALL;
const DEPTH    = 2.0;
const BALL_R   = 0.62;
const PEG_R    = 0.5;
const GRAV     = 0.0125;   // gravidade por frame-unit (lento, dramático)
const REST_PEG = 0.66;
const SPEED_MAX = 3.4;

const PALETTE = [
  "#ff4d4d","#ff8c00","#ffd700","#00e676","#00b0ff","#d500f9","#f06292","#26c6da",
  "#69f0ae","#ffa726","#ef5350","#ab47bc","#42a5f5","#26a69a","#cddc39","#ff7043",
  "#7e57c2","#ec407a","#5c6bc0","#9ccc65",
];
const getColor = (i: number) => PALETTE[i % PALETTE.length];
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`);

interface Participant { username: string; displayName: string; image: string | null; }
interface RaceData { participants: Participant[]; numVencedores: number; saldoRestante: number; }
interface Ball {
  p: Participant; color: string;
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  mesh: any; label: any; finished: boolean; place: number; pop: number;
}
interface Peg { x: number; y: number; z: number; }

export default function CorridaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [phase, setPhase] = useState<"prepare" | "racing" | "result">("prepare");
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [winners, setWinners] = useState<Array<Participant & { place: number }>>([]);
  const [valores, setValores] = useState<number[]>([]);
  const [enviando, setEnviando] = useState<"" | "auto" | "fila">("");
  const [enviado, setEnviado] = useState(false);
  const [ggpixOk, setGgpixOk] = useState(false);
  const [raceMsg, setRaceMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef  = useRef<Ball[]>([]);
  const pegsRef   = useRef<Peg[]>([]);
  const rafRef    = useRef(0);
  const finCntRef = useRef(0);
  const endedRef  = useRef(false);
  const prevTsRef = useRef(0);
  const dragRef   = useRef(false);
  const lastMRef  = useRef({ x: 0, y: 0 });
  const camAng    = useRef({ theta: Math.PI / 2, phi: 1.32, radius: 26 });
  const camTgt    = useRef({ x: 0, y: TOP_Y - 5, z: 0 });
  const cameraRef = useRef<any>(null);
  const rendRef   = useRef<any>(null);
  const sceneRef  = useRef<any>(null);
  const pinchRef  = useRef(0);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  useEffect(() => {
    const raw = localStorage.getItem("corrida-race-data");
    if (raw) setRaceData(JSON.parse(raw) as RaceData);
    fetch("/api/config").then(r => r.ok ? r.json() : null).then(d => setGgpixOk(!!d?.ggpix?.ok)).catch(() => {});
  }, []);

  const updateCamera = useCallback(() => {
    const cam = cameraRef.current, t = camTgt.current, a = camAng.current;
    if (!cam) return;
    cam.position.x = t.x + a.radius * Math.sin(a.phi) * Math.cos(a.theta);
    cam.position.y = t.y + a.radius * Math.cos(a.phi);
    cam.position.z = t.z + a.radius * Math.sin(a.phi) * Math.sin(a.theta);
    cam.lookAt(t.x, t.y, t.z);
  }, []);

  function nameSprite(THREE: any, name: string, color: string) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 60;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath(); (ctx as any).roundRect?.(3, 6, 250, 48, 12); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; (ctx as any).roundRect?.(3, 6, 250, 48, 12); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 28px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(name.slice(0, 13), 128, 31);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(3.4, 0.8, 1);
    return spr;
  }

  const initRace = useCallback(async () => {
    if (!raceData || !canvasRef.current) return;
    const THREE = await import("three");
    const canvas = canvasRef.current;
    const W = canvas.parentElement?.clientWidth || window.innerWidth;
    const H = canvas.parentElement?.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x05100a); rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05100a, 34, 90); sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 300);
    cameraRef.current = camera; updateCamera();

    scene.add(new THREE.AmbientLight(0x6688aa, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(6, TOP_Y + 6, 22); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -14; key.shadow.camera.right = 14;
    key.shadow.camera.top = 14; key.shadow.camera.bottom = -90; key.shadow.camera.far = 120;
    scene.add(key);
    scene.add(new THREE.DirectionalLight(0x44ffaa, 0.7).translateZ(-20));

    // estrelas
    const sPos = new Float32Array(3000);
    for (let i = 0; i < 3000; i += 3) { sPos[i] = (Math.random()-0.5)*220; sPos[i+1] = (Math.random()-0.5)*220; sPos[i+2] = -20 - Math.random()*120; }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0x88ffcc, size: 0.4 })));

    // painel de fundo (atrás dos pinos)
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_W + 2, FALL + 14),
      new THREE.MeshStandardMaterial({ color: 0x0a1f12, roughness: 0.9, metalness: 0.1 })
    );
    back.position.set(0, TOP_Y - FALL / 2, -DEPTH - 1); back.receiveShadow = true; scene.add(back);

    // paredes laterais
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x14361f, roughness: 0.7, metalness: 0.3, emissive: 0x0a2414, emissiveIntensity: 0.4 });
    for (const sx of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, FALL + 14, DEPTH * 2 + 1.5), wallMat);
      wall.position.set(sx * (WALL_X + 0.25), TOP_Y - FALL / 2, 0); wall.receiveShadow = true; scene.add(wall);
    }

    // pinos
    const pegs: Peg[] = [];
    const pegMeshes: any[] = [];
    let row = 0;
    for (let y = TOP_Y - 6; y > FINISH_Y + 5; y -= 4.4, row++) {
      const cols = 5 + (row % 2);
      const gap = (LANE_W - 2) / (cols + 1);
      for (let c = 0; c < cols; c++) {
        let x = -LANE_W / 2 + 1 + gap * (c + 1);
        if (row % 2) x -= gap / 2;
        if (Math.abs(x) > WALL_X - PEG_R - 0.3) continue;
        const z = (Math.random() - 0.5) * (DEPTH * 1.2);
        pegs.push({ x, y, z });
        const hue = (row * 37 + c * 71) % 360;
        const col3 = new THREE.Color().setHSL(hue / 360, 0.8, 0.55);
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(PEG_R, 16, 12),
          new THREE.MeshStandardMaterial({ color: col3, roughness: 0.2, metalness: 0.8, emissive: col3, emissiveIntensity: 0.3 })
        );
        m.position.set(x, y, z); m.castShadow = true; scene.add(m); pegMeshes.push(m);
      }
    }
    pegsRef.current = pegs;

    // linha de chegada
    const finMat = new THREE.MeshStandardMaterial({ color: 0xffba00, emissive: 0xffba00, emissiveIntensity: 1.4 });
    const finBar = new THREE.Mesh(new THREE.BoxGeometry(LANE_W, 0.5, DEPTH * 2 + 1), finMat);
    finBar.position.set(0, FINISH_Y, 0); scene.add(finBar);
    scene.add(new THREE.PointLight(0xffba00, 4, 26).translateY(FINISH_Y + 1));
    const fc = document.createElement("canvas"); fc.width = 256; fc.height = 64;
    const fctx = fc.getContext("2d")!; fctx.fillStyle = "#ffba00"; fctx.font = "bold 30px Arial"; fctx.textAlign = "center"; fctx.textBaseline = "middle"; fctx.fillText("🏁 CHEGADA", 128, 34);
    const fspr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(fc), transparent: true }));
    fspr.position.set(0, FINISH_Y + 2.4, 0); fspr.scale.set(10, 2.5, 1); scene.add(fspr);

    // bolinhas com avatar
    const loader = new THREE.TextureLoader(); loader.setCrossOrigin("anonymous");
    const balls: Ball[] = [];
    const n = raceData.participants.length;
    const perRow = Math.min(n, 8);
    const ballGeo = new THREE.SphereGeometry(BALL_R, 24, 18);
    for (let i = 0; i < n; i++) {
      const p = raceData.participants[i];
      const color = getColor(i); const c3 = new THREE.Color(color);
      let mat: any;
      if (p.image) {
        const tex = loader.load(`/api/avatar?u=${encodeURIComponent(p.image)}`);
        (tex as any).colorSpace = THREE.SRGBColorSpace;
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.1, emissive: c3, emissiveIntensity: 0.12 });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: c3, roughness: 0.25, metalness: 0.6, emissive: c3, emissiveIntensity: 0.25 });
      }
      const mesh = new THREE.Mesh(ballGeo, mat); mesh.castShadow = true;
      const col = i % perRow, rw = Math.floor(i / perRow);
      const x = -((Math.min(n, perRow) - 1) / 2) * 1.7 + col * 1.7 + (Math.random() - 0.5) * 0.3;
      const y = TOP_Y + rw * 1.6;
      const z = (Math.random() - 0.5) * DEPTH;
      mesh.position.set(x, y, z); scene.add(mesh);
      // aro colorido
      const ring = new THREE.Mesh(new THREE.TorusGeometry(BALL_R + 0.05, 0.07, 8, 24), new THREE.MeshBasicMaterial({ color: c3 }));
      mesh.add(ring);
      const label = nameSprite(THREE, p.displayName || p.username, color); scene.add(label);
      balls.push({ p, color, x, y, z, vx: (Math.random()-0.5)*0.05, vy: 0, vz: (Math.random()-0.5)*0.05, mesh, label, finished: false, place: 0, pop: 0 });
    }
    ballsRef.current = balls; finCntRef.current = 0; endedRef.current = false;

    camTgt.current = { x: 0, y: TOP_Y - 4, z: 0 };
    camAng.current = { theta: Math.PI / 2, phi: 1.32, radius: 26 }; updateCamera();

    // controles de câmera
    const onDown = (e: MouseEvent) => { dragRef.current = true; lastMRef.current = { x: e.clientX, y: e.clientY }; canvas.style.cursor = "grabbing"; };
    const onMove = (e: MouseEvent) => { if (!dragRef.current) return; camAng.current.theta -= (e.clientX - lastMRef.current.x) * 0.008; camAng.current.phi = Math.max(0.2, Math.min(1.5, camAng.current.phi + (e.clientY - lastMRef.current.y) * 0.008)); lastMRef.current = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { dragRef.current = false; canvas.style.cursor = "grab"; };
    const onWheel = (e: WheelEvent) => { camAng.current.radius = Math.max(8, Math.min(80, camAng.current.radius + e.deltaY * 0.05)); e.preventDefault(); };
    const onTS = (e: TouchEvent) => { if (e.touches.length === 1) { dragRef.current = true; lastMRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } else if (e.touches.length === 2) pinchRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); };
    const onTM = (e: TouchEvent) => { if (e.touches.length === 1 && dragRef.current) { camAng.current.theta -= (e.touches[0].clientX - lastMRef.current.x) * 0.01; camAng.current.phi = Math.max(0.2, Math.min(1.5, camAng.current.phi + (e.touches[0].clientY - lastMRef.current.y) * 0.01)); lastMRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } else if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); camAng.current.radius = Math.max(8, Math.min(80, camAng.current.radius - (d - pinchRef.current) * 0.1)); pinchRef.current = d; } };
    const onTE = () => { dragRef.current = false; };
    canvas.addEventListener("mousedown", onDown); canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp); canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTS, { passive: true }); canvas.addEventListener("touchmove", onTM, { passive: true }); canvas.addEventListener("touchend", onTE);
    const onResize = () => { const W2 = canvas.parentElement?.clientWidth || window.innerWidth; const H2 = canvas.parentElement?.clientHeight || window.innerHeight; camera.aspect = W2 / H2; camera.updateProjectionMatrix(); renderer.setSize(W2, H2); };
    window.addEventListener("resize", onResize);

    prevTsRef.current = performance.now();
    const animate = (ts: number) => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min((ts - prevTsRef.current) / 16.667, 2.2); prevTsRef.current = ts;
      const balls = ballsRef.current, pegs = pegsRef.current, nVenc = raceData.numVencedores;
      const wx = WALL_X - BALL_R;

      if (!endedRef.current) {
        for (let s = 0; s < 2; s++) {
          const half = dt / 2;
          for (const b of balls) {
            if (b.finished) continue;
            b.vy -= GRAV * half;
            b.x += b.vx * half; b.y += b.vy * half; b.z += b.vz * half;
            if (b.x > wx) { b.x = wx; b.vx = -Math.abs(b.vx) * 0.6; }
            if (b.x < -wx) { b.x = -wx; b.vx = Math.abs(b.vx) * 0.6; }
            if (b.z > DEPTH) { b.z = DEPTH; b.vz = -Math.abs(b.vz) * 0.5; }
            if (b.z < -DEPTH) { b.z = -DEPTH; b.vz = Math.abs(b.vz) * 0.5; }
            for (const pg of pegs) {
              if (Math.abs(pg.y - b.y) > 2) continue;
              const dx = b.x - pg.x, dy = b.y - pg.y, dz = b.z - pg.z;
              const d2 = dx*dx + dy*dy + dz*dz, md = BALL_R + PEG_R;
              if (d2 < md*md && d2 > 1e-4) {
                const d = Math.sqrt(d2), nx = dx/d, ny = dy/d, nz = dz/d;
                b.x = pg.x + nx*md; b.y = pg.y + ny*md; b.z = pg.z + nz*md;
                const dot = b.vx*nx + b.vy*ny + b.vz*nz;
                if (dot < 0) { const f = (1+REST_PEG)*dot; b.vx -= f*nx; b.vy -= f*ny; b.vz -= f*nz; }
                b.vx += (Math.random()-0.5)*0.14;
              }
            }
            for (const b2 of balls) {
              if (b2 === b || b2.finished) continue;
              const dx = b.x-b2.x, dy = b.y-b2.y, dz = b.z-b2.z;
              if (Math.abs(dy) > 2*BALL_R) continue;
              const d2 = dx*dx+dy*dy+dz*dz, md = 2*BALL_R;
              if (d2 < md*md && d2 > 1e-4) {
                const d = Math.sqrt(d2), nx=dx/d, ny=dy/d, nz=dz/d, sep=(md-d)/2;
                b.x+=nx*sep; b.y+=ny*sep; b.z+=nz*sep; b2.x-=nx*sep; b2.y-=ny*sep; b2.z-=nz*sep;
                const dvx=b.vx-b2.vx, dvy=b.vy-b2.vy, dvz=b.vz-b2.vz, dot=dvx*nx+dvy*ny+dvz*nz;
                if (dot<0) { b.vx-=dot*nx*0.5; b.vy-=dot*ny*0.5; b.vz-=dot*nz*0.5; b2.vx+=dot*nx*0.5; b2.vy+=dot*ny*0.5; b2.vz+=dot*nz*0.5; }
              }
            }
            const sp = Math.sqrt(b.vx*b.vx+b.vy*b.vy+b.vz*b.vz);
            if (sp > SPEED_MAX) { const r = SPEED_MAX/sp; b.vx*=r; b.vy*=r; b.vz*=r; }
            if (b.y <= FINISH_Y && !b.finished) {
              b.finished = true; b.place = ++finCntRef.current; b.pop = 1;
              b.y = FINISH_Y; b.vx = b.vy = b.vz = 0;
              setRaceMsg(`${medal(b.place-1)} ${b.p.displayName || b.p.username} chegou!`);
              if (finCntRef.current >= nVenc && !endedRef.current) {
                endedRef.current = true;
                setTimeout(() => {
                  const top = [...balls].filter(x => x.finished).sort((a,c) => a.place-c.place).slice(0, nVenc);
                  setWinners(top.map(bb => ({ ...bb.p, place: bb.place })));
                  const sug = Math.max(1, Math.floor(raceData.saldoRestante / top.length));
                  setValores(top.map(() => sug));
                  cancelAnimationFrame(rafRef.current); setPhase("result");
                }, 1800);
              }
            }
          }
        }
        if (!dragRef.current) {
          let lead = TOP_Y; for (const b of balls) if (!b.finished && b.y < lead) lead = b.y;
          camTgt.current.y += (Math.max(FINISH_Y + 4, lead - 1) - camTgt.current.y) * 0.05;
        }
      }

      for (const b of balls) {
        b.mesh.position.set(b.x, b.y, b.z);
        b.mesh.rotation.x += b.vy * 0.04; b.mesh.rotation.z -= b.vx * 0.04;
        if (b.pop > 0) { const s = 1 + b.pop * 0.5; b.mesh.scale.set(s, s, s); b.pop = Math.max(0, b.pop - 0.04 * dt); }
        else b.mesh.scale.set(1, 1, 1);
        b.label.position.set(b.x, b.y + BALL_R + 0.8, b.z);
      }
      for (const m of pegMeshes) m.rotation.y += 0.015 * dt;
      updateCamera(); renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mouseup", onUp); window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [raceData, updateCamera]);

  useEffect(() => {
    if (phase !== "racing") return;
    let cleanup: (() => void) | undefined;
    const t = setTimeout(async () => { cleanup = (await initRace()) ?? undefined; }, 60);
    return () => { clearTimeout(t); cleanup?.(); cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function enviar(modo: "auto" | "fila") {
    if (enviado || enviando) return;
    setEnviando(modo);
    const action = modo === "auto" ? "enviar-manual" : "enviar-manual-fila";
    let allOk = true;
    for (let i = 0; i < winners.length; i++) {
      const v = valores[i] || 0; if (v <= 0) continue;
      try {
        const r = await fetch("/api/gorjeta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, username: winners[i].username, valor: v }) });
        if (!r.ok) allOk = false;
      } catch { allOk = false; }
    }
    setEnviando(""); if (allOk) setEnviado(true);
  }

  const total = valores.reduce((s, v) => s + (v || 0), 0);
  const saldo = raceData?.saldoRestante || 0;
  const cobre = total <= saldo;

  if (!raceData) {
    return (
      <div className="min-h-screen bg-[#060e0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-400">Dados não encontrados. Acesse via Gorjeta → aba Corrida.</p>
          <button onClick={() => router.push("/admin/gorjeta")} className="px-5 py-2.5 rounded-xl font-black text-sm text-black" style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>← Voltar à Gorjeta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#060e0a] flex flex-col" style={{ height: "100dvh" }}>
      <div className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: "rgba(6,14,10,0.97)", zIndex: 20 }}>
        <button onClick={() => { cancelAnimationFrame(rafRef.current); router.push("/admin/gorjeta"); }} className="text-gray-500 hover:text-white text-sm font-bold transition-colors">← Gorjeta</button>
        <span className="text-white font-black flex-1 truncate">🏁 Corrida de Bolinhas 3D</span>
        {phase === "racing" && raceMsg && <span className="text-[#ffba00] text-xs font-black animate-pulse">{raceMsg}</span>}
        {phase === "racing" && <span className="text-gray-600 text-[11px] hidden sm:block">🖱️ Arraste pra girar · Scroll zoom</span>}
      </div>

      {phase === "prepare" && (
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="text-center">
              <p className="text-4xl font-black text-white">🏁 Preparar Corrida</p>
              <p className="text-gray-500 text-sm mt-1">{raceData.participants.length} participantes · Top {raceData.numVencedores} ganham</p>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))" }}>
              {raceData.participants.map((p, i) => (
                <div key={p.username} className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-black text-white flex-shrink-0" style={{ background: getColor(i), border: `2px solid ${getColor(i)}` }}>
                    {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : (p.displayName || p.username)[0]?.toUpperCase()}
                  </div>
                  <p className="text-[10px] font-black text-white text-center truncate w-full leading-tight">{p.displayName || p.username}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)" }}>
              <p className="text-xs text-gray-500 leading-relaxed">Os <strong className="text-[#ffba00]">{raceData.numVencedores}</strong> primeiros a cruzar a linha de baixo recebem a gorjeta. Use o mouse pra girar a câmera durante a corrida.</p>
            </div>
            <button onClick={() => setPhase("racing")} className="w-full py-5 rounded-2xl font-black text-xl text-black transition-all hover:scale-[1.02] active:scale-95" style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)", boxShadow: "0 6px 30px rgba(255,186,0,0.4)" }}>
              🚀 Iniciar Corrida 3D
            </button>
          </div>
        </div>
      )}

      {phase === "racing" && (
        <div className="flex-1 relative">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ cursor: "grab", touchAction: "none" }} />
        </div>
      )}

      {phase === "result" && (
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="text-center py-2">
              <p className="text-4xl font-black text-white" style={{ animation: "popIn .5s ease-out" }}>🏆 Resultado!</p>
              <p className="text-gray-500 text-sm mt-1">Top {raceData.numVencedores} da corrida</p>
            </div>
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)" }}>
              <span className="text-xs font-black text-gray-400 flex-1">Mesmo valor pra todos (R$)</span>
              <input type="text" inputMode="decimal" placeholder="0,00"
                onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v) && v >= 0) setValores(winners.map(() => v)); }}
                className="w-28 px-3 py-2 rounded-xl text-sm font-black text-white text-right outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,186,0,0.3)" }} />
            </div>
            <div className="space-y-2">
              {winners.map((w, i) => (
                <div key={w.username} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", animation: `popIn .4s ease-out ${i * 0.06}s both` }}>
                  <span className="text-base w-8 text-center flex-shrink-0">{medal(i)}</span>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-white" style={{ background: getColor(i) }}>
                    {w.image ? <img src={w.image} alt="" className="w-full h-full object-cover" /> : (w.displayName || w.username)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{w.displayName}</p>
                    <p className="text-[10px] text-gray-600">@{w.username}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-black text-[#ffba00]">R$</span>
                    <input type="text" inputMode="decimal" value={valores[i] ?? ""}
                      onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); setValores(arr => arr.map((x, k) => k === i ? (isNaN(v) ? 0 : v) : x)); }}
                      className="w-20 px-2 py-1.5 rounded-lg text-sm font-black text-white text-right outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: cobre ? "rgba(34,197,94,0.06)" : "rgba(248,113,113,0.08)", border: `1px solid ${cobre ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.3)"}` }}>
              <span className="text-xs font-black text-gray-400">Total a pagar</span>
              <span className="text-lg font-black" style={{ color: cobre ? "#4ade80" : "#f87171" }}>R$ {fmtBRL(total)} <span className="text-[11px] text-gray-600">/ saldo R$ {fmtBRL(saldo)}</span></span>
            </div>
            {!cobre && <p className="text-center text-xs text-red-400 font-bold">Total passa do saldo — reduza os valores.</p>}
            {enviado ? (
              <div className="text-center space-y-3 py-2">
                <p className="text-lg font-black text-green-400">✓ Pagamentos registrados!</p>
                <button onClick={() => router.push("/admin/gorjeta")} className="w-full py-3.5 rounded-2xl font-black text-sm text-black" style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>← Voltar para Gorjeta</button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button onClick={() => enviar("auto")} disabled={!!enviando || !cobre || !ggpixOk} className="py-4 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] disabled:cursor-not-allowed"
                    style={(ggpixOk && cobre) ? { background: "linear-gradient(135deg,#4ade80,#22c55e)", color: "#000" } : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#4b5563" }}>
                    {!ggpixOk ? "⚡ PIX automático (GGPix off)" : enviando === "auto" ? "Enviando..." : "⚡ Enviar PIX a todos"}
                  </button>
                  <button onClick={() => enviar("fila")} disabled={!!enviando || !cobre} className="py-4 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-60" style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>
                    {enviando === "fila" ? "..." : "💳 Pagamento manual"}
                  </button>
                </div>
                <button onClick={() => router.push("/admin/gorjeta")} className="w-full py-2.5 rounded-2xl font-black text-xs hover:bg-white/5 transition-colors" style={{ color: "#6b7280" }}>← Voltar para Gorjeta</button>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes popIn { 0% { opacity:0; transform:scale(0.7) translateY(10px); } 100% { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}
