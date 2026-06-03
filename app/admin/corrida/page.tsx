"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/admins";

// ── Constantes de física e pista ────────────────────────────────────────────
const SLOPE_TAN   = 0.38;                        // tan(≈21°)
const SLOPE_ANGLE = Math.atan(SLOPE_TAN);
const SLOPE_COS   = Math.cos(SLOPE_ANGLE);
const SLOPE_SIN   = Math.sin(SLOPE_ANGLE);
const START_Y     = 22;
const TRACK_W     = 12;
const TRACK_LEN   = 90;
const START_Z     = 1.5;
const FINISH_Z    = TRACK_LEN - 3;
const BALL_R      = 0.55;
const PEG_R       = 0.52;
const GRAVITY_Y   = -0.013;    // por frame (será escalonado por dt)
const RESTITUTION = 0.55;
const FRICTION    = 0.987;
const SPEED_MAX   = 4.5;

const PALETTE = [
  "#ff4d4d","#ff8c00","#ffd700","#00e676","#00b0ff",
  "#d500f9","#f06292","#26c6da","#69f0ae","#ffa726",
  "#ef5350","#ab47bc","#42a5f5","#26a69a","#cddc39",
  "#ff7043","#78909c","#ec407a","#7e57c2","#26c6da",
];

function floorY(z: number) { return START_Y - z * SLOPE_TAN; }
function getColor(i: number) { return PALETTE[i % PALETTE.length]; }
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function medal(i: number) { return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`; }

interface Participant { username: string; displayName: string; image: string | null; }
interface RaceData { participants: Participant[]; numVencedores: number; saldoRestante: number; }
interface Ball {
  p: Participant; idx: number; color: string;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  mesh: any; label: any;
  finished: boolean; place: number;
}
interface Obstacle { x: number; y: number; z: number; r: number; mesh: any; }

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

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const ballsRef   = useRef<Ball[]>([]);
  const obsRef     = useRef<Obstacle[]>([]);
  const rafRef     = useRef(0);
  const finCntRef  = useRef(0);
  const endedRef   = useRef(false);
  const prevTsRef  = useRef(0);
  const isDragRef  = useRef(false);
  const lastMRef   = useRef({ x: 0, y: 0 });
  const camAng     = useRef({ theta: 0.9, phi: 0.72, radius: 32 });
  const camTgt     = useRef({ x: 0, y: START_Y - (TRACK_LEN / 2) * SLOPE_TAN, z: TRACK_LEN / 2 });
  const THREE_REF  = useRef<any>(null);
  const rendRef    = useRef<any>(null);
  const sceneRef   = useRef<any>(null);
  const cameraRef  = useRef<any>(null);
  const touchDistRef = useRef(0);

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  // Load race data + GGPix status
  useEffect(() => {
    const raw = localStorage.getItem("corrida-race-data");
    if (raw) setRaceData(JSON.parse(raw) as RaceData);
    fetch("/api/config").then(r => r.ok ? r.json() : null)
      .then(d => setGgpixOk(!!d?.ggpix?.ok)).catch(() => {});
  }, []);

  // Camera helper
  const updateCamera = useCallback(() => {
    const cam = cameraRef.current, tgt = camTgt.current, ang = camAng.current;
    if (!cam) return;
    cam.position.x = tgt.x + ang.radius * Math.sin(ang.phi) * Math.cos(ang.theta);
    cam.position.y = tgt.y + ang.radius * Math.cos(ang.phi);
    cam.position.z = tgt.z + ang.radius * Math.sin(ang.phi) * Math.sin(ang.theta);
    cam.lookAt(tgt.x, tgt.y, tgt.z);
  }, []);

  // Build label texture for ball name
  function makeLabelTexture(THREE: any, name: string, color: string) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 56;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath(); ctx.roundRect(2, 4, 252, 48, 10); ctx.fill();
    ctx.fillStyle = color; ctx.font = "bold 26px Arial"; ctx.textAlign = "center";
    ctx.textBaseline = "middle"; ctx.fillText(name.slice(0, 14), 128, 28);
    const tex = new THREE.CanvasTexture(c);
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  }

  // Init Three.js and start physics
  const initRace = useCallback(async () => {
    if (!raceData || !canvasRef.current) return;
    const THREE = await import("three");
    THREE_REF.current = THREE;

    const canvas = canvasRef.current;
    const W = canvas.parentElement?.clientWidth || window.innerWidth;
    const H = canvas.parentElement?.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x060e0a);
    rendRef.current = renderer;

    // Scene + fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060e0a, 0.014);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 400);
    cameraRef.current = camera;
    updateCamera();

    // Lights
    scene.add(new THREE.AmbientLight(0x334433, 2.2));
    const sun = new THREE.DirectionalLight(0xffeedd, 3);
    sun.position.set(15, 40, -5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    sun.shadow.camera.far = 200;
    scene.add(sun);
    for (let z = 8; z < TRACK_LEN; z += 16) {
      const pt = new THREE.PointLight(0x44ffaa, 0.9, 22);
      pt.position.set(0, floorY(z) + 4, z); scene.add(pt);
    }

    // Stars
    const sPos = new Float32Array(3600);
    for (let i = 0; i < 3600; i += 3) {
      sPos[i] = (Math.random() - 0.5) * 250;
      sPos[i+1] = (Math.random() - 0.5) * 250;
      sPos[i+2] = (Math.random() - 0.5) * 250;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true })));

    // Track quaternion (tilt forward by slope angle)
    const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-SLOPE_ANGLE, 0, 0));
    const trackLenTilted = TRACK_LEN / SLOPE_COS;
    const midZ = TRACK_LEN / 2;

    // Track floor
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x122b18, roughness: 0.75, metalness: 0.15, emissive: 0x061208 });
    const trackMesh = new THREE.Mesh(new THREE.BoxGeometry(TRACK_W, 0.35, trackLenTilted), trackMat);
    trackMesh.position.set(0, floorY(midZ) - 0.175, midZ);
    trackMesh.quaternion.copy(tiltQ);
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // Lane stripes
    for (let z = 4; z < TRACK_LEN; z += 8) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.36, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1a5c2a, emissive: 0x0a3014, emissiveIntensity: 0.5 })
      );
      stripe.position.set(0, floorY(z) + 0.01, z);
      stripe.quaternion.copy(tiltQ);
      scene.add(stripe);
    }

    // Side walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b2212, roughness: 0.85 });
    for (const sx of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, trackLenTilted), wallMat);
      wall.position.set(sx * (TRACK_W / 2 + 0.2), floorY(midZ) + 0.85, midZ);
      wall.quaternion.copy(tiltQ);
      wall.receiveShadow = true;
      scene.add(wall);
    }

    // Finish line
    const finY = floorY(FINISH_Z);
    const finMesh = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_W, 0.05, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xffba00, emissive: 0xffba00, emissiveIntensity: 1.2 })
    );
    finMesh.position.set(0, finY + 0.18, FINISH_Z);
    finMesh.quaternion.copy(tiltQ);
    scene.add(finMesh);
    const finLight = new THREE.PointLight(0xffba00, 3, 12);
    finLight.position.set(0, finY + 3, FINISH_Z);
    scene.add(finLight);

    // Finish flag sprite
    const fc = document.createElement("canvas"); fc.width = 256; fc.height = 64;
    const fctx = fc.getContext("2d")!;
    fctx.fillStyle = "#ffba00"; fctx.font = "bold 32px Arial"; fctx.textAlign = "center";
    fctx.textBaseline = "middle"; fctx.fillText("🏁 CHEGADA", 128, 32);
    const finSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(fc), transparent: true }));
    finSprite.position.set(0, finY + 3.5, FINISH_Z);
    finSprite.scale.set(9, 2.2, 1);
    scene.add(finSprite);

    // Obstacles (spheres + cylinders)
    const obstacles: Obstacle[] = [];
    const nRows = 12;
    for (let row = 0; row < nRows; row++) {
      const z = START_Z + 7 + row * ((FINISH_Z - START_Z - 10) / nRows) + (Math.random() - 0.5) * 2;
      const nCols = 3 + (row % 3 === 0 ? 2 : 0);
      const spacing = (TRACK_W - 2.5) / (nCols + 1);
      for (let col = 0; col < nCols; col++) {
        const x = -TRACK_W / 2 + 1.25 + spacing * (col + 1) + (row % 2 === 0 ? spacing / 2 : 0);
        if (Math.abs(x) > TRACK_W / 2 - PEG_R - 0.3) continue;
        const y = floorY(z) + PEG_R + 0.35;
        const hue = (row * 41 + col * 89) % 360;
        const col3 = new THREE.Color().setHSL(hue / 360, 0.85, 0.55);
        const isPillar = (row + col) % 3 === 0;
        const geo = isPillar
          ? new THREE.CylinderGeometry(PEG_R * 0.6, PEG_R * 0.8, 1.8, 10)
          : new THREE.SphereGeometry(PEG_R, 14, 10);
        const mat = new THREE.MeshStandardMaterial({ color: col3, roughness: 0.25, metalness: 0.75, emissive: col3, emissiveIntensity: 0.18 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        if (isPillar) mesh.quaternion.copy(tiltQ);
        mesh.castShadow = true;
        scene.add(mesh);
        obstacles.push({ x, y, z, r: PEG_R, mesh });
      }
    }
    obsRef.current = obstacles;

    // Balls
    const balls: Ball[] = [];
    const n = raceData.participants.length;
    const perRow = Math.min(n, 7);
    const ballGeo = new THREE.SphereGeometry(BALL_R, 20, 16);

    for (let i = 0; i < n; i++) {
      const p = raceData.participants[i];
      const col = i % perRow, row = Math.floor(i / perRow);
      const x = -((Math.min(n, perRow) - 1) / 2) * 1.4 + col * 1.4;
      const z = START_Z + row * 1.6 + Math.random() * 0.3;
      const y = floorY(z) + BALL_R + 0.1;
      const color = getColor(i);
      const c3 = new THREE.Color(color);
      const mat = new THREE.MeshStandardMaterial({ color: c3, roughness: 0.18, metalness: 0.65, emissive: c3, emissiveIntensity: 0.2 });
      const mesh = new THREE.Mesh(ballGeo, mat);
      mesh.position.set(x, y, z); mesh.castShadow = true;
      scene.add(mesh);
      const label = new THREE.Sprite(makeLabelTexture(THREE, p.displayName || p.username, color));
      label.scale.set(3.6, 0.9, 1);
      scene.add(label);
      balls.push({ p, idx: i, color, x, y, z, vx: (Math.random() - 0.5) * 0.06, vy: 0, vz: 0.015 + Math.random() * 0.02, mesh, label, finished: false, place: 0 });
    }
    ballsRef.current = balls;
    finCntRef.current = 0; endedRef.current = false;

    // Camera target initial
    camTgt.current = { x: 0, y: floorY(TRACK_LEN * 0.3) + 3, z: TRACK_LEN * 0.3 };
    camAng.current = { theta: 0.9, phi: 0.72, radius: 32 };
    updateCamera();

    // Mouse/touch orbit controls
    const onDown = (e: MouseEvent) => { isDragRef.current = true; lastMRef.current = { x: e.clientX, y: e.clientY }; canvas.style.cursor = "grabbing"; };
    const onMove = (e: MouseEvent) => {
      if (!isDragRef.current) return;
      camAng.current.theta -= (e.clientX - lastMRef.current.x) * 0.009;
      camAng.current.phi = Math.max(0.12, Math.min(1.45, camAng.current.phi + (e.clientY - lastMRef.current.y) * 0.009));
      lastMRef.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { isDragRef.current = false; canvas.style.cursor = "grab"; };
    const onWheel = (e: WheelEvent) => { camAng.current.radius = Math.max(6, Math.min(90, camAng.current.radius + e.deltaY * 0.06)); e.preventDefault(); };
    const onTStart = (e: TouchEvent) => {
      if (e.touches.length === 1) { isDragRef.current = true; lastMRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
      else if (e.touches.length === 2) touchDistRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragRef.current) {
        camAng.current.theta -= (e.touches[0].clientX - lastMRef.current.x) * 0.011;
        camAng.current.phi = Math.max(0.12, Math.min(1.45, camAng.current.phi + (e.touches[0].clientY - lastMRef.current.y) * 0.011));
        lastMRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        camAng.current.radius = Math.max(6, Math.min(90, camAng.current.radius - (d - touchDistRef.current) * 0.12));
        touchDistRef.current = d;
      }
    };
    const onTEnd = () => { isDragRef.current = false; };
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTStart, { passive: true });
    canvas.addEventListener("touchmove", onTMove, { passive: true });
    canvas.addEventListener("touchend", onTEnd);

    // Resize
    const onResize = () => {
      const W2 = canvas.parentElement?.clientWidth || window.innerWidth;
      const H2 = canvas.parentElement?.clientHeight || window.innerHeight;
      camera.aspect = W2 / H2; camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    prevTsRef.current = performance.now();

    // Main loop
    const animate = (ts: number) => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min((ts - prevTsRef.current) / 16.667, 2.5);
      prevTsRef.current = ts;

      const balls = ballsRef.current, obs = obsRef.current;
      const nVenc = raceData.numVencedores;

      if (!endedRef.current) {
        // Physics: 2 sub-steps for stability
        for (let step = 0; step < 2; step++) {
          const half = dt / 2;
          for (const b of balls) {
            if (b.finished) continue;
            b.vy += GRAVITY_Y * half;
            b.x += b.vx * half; b.y += b.vy * half; b.z += b.vz * half;

            // Track floor
            const fy = floorY(b.z);
            if (b.y < fy + BALL_R) {
              b.y = fy + BALL_R;
              const vn = b.vy * SLOPE_COS + b.vz * SLOPE_SIN;
              if (vn < 0) {
                const f = (1 + RESTITUTION) * vn;
                b.vy -= f * SLOPE_COS; b.vz -= f * SLOPE_SIN;
              }
              b.vx *= FRICTION; b.vz *= FRICTION;
            }

            // Walls
            const wx = TRACK_W / 2 - BALL_R;
            if (b.x > wx) { b.x = wx; b.vx = -Math.abs(b.vx) * 0.65; }
            if (b.x < -wx) { b.x = -wx; b.vx = Math.abs(b.vx) * 0.65; }
            if (b.z < START_Z) { b.z = START_Z; b.vz = Math.abs(b.vz) * 0.5; }

            // Obstacles
            for (const obs2 of obs) {
              if (Math.abs(obs2.z - b.z) > 2.5) continue;
              const dx = b.x - obs2.x, dy = b.y - obs2.y, dz = b.z - obs2.z;
              const d2 = dx*dx + dy*dy + dz*dz, md = BALL_R + obs2.r;
              if (d2 < md*md && d2 > 0.001) {
                const d = Math.sqrt(d2), nx = dx/d, ny = dy/d, nz = dz/d;
                b.x = obs2.x + nx*md; b.y = obs2.y + ny*md; b.z = obs2.z + nz*md;
                const dot = b.vx*nx + b.vy*ny + b.vz*nz;
                if (dot < 0) { b.vx -= (1+0.72)*dot*nx; b.vy -= (1+0.72)*dot*ny; b.vz -= (1+0.72)*dot*nz; }
                b.vx += (Math.random() - 0.5) * 0.1;
              }
            }

            // Ball–ball
            for (const b2 of balls) {
              if (b2 === b || b2.finished) continue;
              const dx = b.x-b2.x, dy = b.y-b2.y, dz = b.z-b2.z;
              if (Math.abs(dz) > 2*BALL_R) continue;
              const d2 = dx*dx+dy*dy+dz*dz, md = 2*BALL_R;
              if (d2 < md*md && d2 > 0.001) {
                const d = Math.sqrt(d2), nx=dx/d, ny=dy/d, nz=dz/d, sep=(md-d)/2;
                b.x+=nx*sep; b.y+=ny*sep; b.z+=nz*sep;
                b2.x-=nx*sep; b2.y-=ny*sep; b2.z-=nz*sep;
                const dvx=b.vx-b2.vx, dvy=b.vy-b2.vy, dvz=b.vz-b2.vz;
                const dot=dvx*nx+dvy*ny+dvz*nz;
                if (dot<0) { b.vx-=dot*nx; b.vy-=dot*ny; b.vz-=dot*nz; b2.vx+=dot*nx; b2.vy+=dot*ny; b2.vz+=dot*nz; }
              }
            }

            // Speed cap
            const spd = Math.sqrt(b.vx*b.vx+b.vy*b.vy+b.vz*b.vz);
            if (spd > SPEED_MAX) { const r = SPEED_MAX/spd; b.vx*=r; b.vy*=r; b.vz*=r; }

            // Safety: fell off
            if (b.y < floorY(b.z) - 6) { b.y = floorY(b.z)+BALL_R; b.vy=0; b.vx=Math.max(-wx,Math.min(wx,b.x)); }

            // Finish
            if (b.z >= FINISH_Z && !b.finished) {
              b.finished = true; b.place = ++finCntRef.current;
              b.x = Math.max(-wx, Math.min(wx, b.x));
              b.z = FINISH_Z; b.vx=0; b.vy=0; b.vz=0;
              const disp = b.p.displayName || b.p.username;
              setRaceMsg(`${medal(b.place-1)} ${disp} chegou!`);
              if (finCntRef.current >= nVenc && !endedRef.current) {
                endedRef.current = true;
                setTimeout(() => {
                  const top = [...balls].filter(x => x.finished).sort((a,c) => a.place-c.place).slice(0, nVenc);
                  setWinners(top.map(bb => ({ ...bb.p, place: bb.place })));
                  const sug = Math.floor(raceData.saldoRestante / top.length);
                  setValores(top.map(() => Math.max(1, sug)));
                  setPhase("result");
                  cancelAnimationFrame(rafRef.current);
                }, 1600);
              }
            }
          }
        }

        // Camera follows leader (smooth)
        if (!isDragRef.current) {
          let leadZ = START_Z;
          for (const b of balls) if (!b.finished && b.z > leadZ) leadZ = b.z;
          const tz = Math.min(FINISH_Z, leadZ + 4);
          camTgt.current.z += (tz - camTgt.current.z) * 0.04;
          camTgt.current.y = floorY(camTgt.current.z) + 3;
        }
      }

      // Update Three.js positions
      for (const b of ballsRef.current) {
        b.mesh.position.set(b.x, b.y, b.z);
        b.label.position.set(b.x, b.y + BALL_R + 1.0, b.z);
      }
      // Rotate obstacles for visual flair
      for (const ob of obsRef.current) { ob.mesh.rotation.y += 0.012 * dt; }

      updateCamera();
      renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [raceData, updateCamera]);

  useEffect(() => {
    if (phase === "racing") return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  const handleStart = useCallback(() => {
    setPhase("racing");
  }, []);

  // When phase becomes "racing", initialize Three.js (canvas is now mounted)
  useEffect(() => {
    if (phase !== "racing") return;
    let cleanup: (() => void) | undefined;
    const timer = setTimeout(async () => { cleanup = await initRace() ?? undefined; }, 80);
    return () => { clearTimeout(timer); cleanup?.(); };
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

  if (!raceData && phase === "prepare") {
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
    <div className="min-h-screen bg-[#060e0a] flex flex-col" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: "rgba(6,14,10,0.97)", zIndex: 20 }}>
        <button onClick={() => { cancelAnimationFrame(rafRef.current); router.push("/admin/gorjeta"); }} className="text-gray-500 hover:text-white text-sm font-bold transition-colors">← Gorjeta</button>
        <span className="text-white font-black flex-1 truncate">🏁 Corrida de Bolinhas 3D</span>
        {phase === "racing" && raceMsg && <span className="text-[#ffba00] text-xs font-black">{raceMsg}</span>}
        {phase === "racing" && <span className="text-gray-600 text-[11px] hidden sm:block">🖱️ Arraste · Scroll zoom</span>}
      </div>

      {/* PREPARE */}
      {phase === "prepare" && raceData && (
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="text-center">
              <p className="text-4xl font-black text-white">🏁 Preparar Corrida</p>
              <p className="text-gray-500 text-sm mt-1">{raceData.participants.length} participantes · Top {raceData.numVencedores} ganham</p>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))" }}>
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
              <p className="text-xs text-gray-500 leading-relaxed">Os <strong className="text-[#ffba00]">{raceData.numVencedores}</strong> primeiros a cruzar a linha recebem a gorjeta. Você define os valores no final. Use o mouse para girar a câmera durante a corrida.</p>
            </div>
            <button onClick={handleStart} className="w-full py-5 rounded-2xl font-black text-xl text-black transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)", boxShadow: "0 6px 30px rgba(255,186,0,0.4)" }}>
              🚀 Iniciar Corrida 3D
            </button>
          </div>
        </div>
      )}

      {/* RACING — canvas tela cheia */}
      {phase === "racing" && (
        <div className="flex-1 relative">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ cursor: "grab", touchAction: "none" }} />
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && (
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="text-center py-2">
              <p className="text-4xl font-black text-white">🏆 Resultado!</p>
              <p className="text-gray-500 text-sm mt-1">Top {raceData?.numVencedores} da corrida</p>
            </div>
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)" }}>
              <span className="text-xs font-black text-gray-400 flex-1">Mesmo valor pra todos (R$)</span>
              <input type="text" inputMode="decimal" placeholder="0,00"
                onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v) && v >= 0) setValores(winners.map(() => v)); }}
                className="w-28 px-3 py-2 rounded-xl text-sm font-black text-white text-right outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,186,0,0.3)" }} />
            </div>
            <div className="space-y-2">
              {winners.map((w, i) => (
                <div key={w.username} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
                      className="w-20 px-2 py-1.5 rounded-lg text-sm font-black text-white text-right outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background: cobre ? "rgba(34,197,94,0.06)" : "rgba(248,113,113,0.08)", border: `1px solid ${cobre ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.3)"}` }}>
              <span className="text-xs font-black text-gray-400">Total a pagar</span>
              <span className="text-lg font-black" style={{ color: cobre ? "#4ade80" : "#f87171" }}>
                R$ {fmtBRL(total)} <span className="text-[11px] text-gray-600">/ saldo R$ {fmtBRL(saldo)}</span>
              </span>
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
                  <button onClick={() => enviar("auto")} disabled={!!enviando || !cobre || !ggpixOk}
                    className="py-4 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] disabled:cursor-not-allowed"
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
    </div>
  );
}
