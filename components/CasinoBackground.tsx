"use client";

export const CHIP_LOGO_URL = "/betdasorte-icon.svg";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const VALUES = ["A", "K", "Q", "J", "10", "9", "7", "2"] as const;
const IS_RED: Record<string, boolean> = { "♥": true, "♦": true, "♠": false, "♣": false };

const CHIP_PAL = [
  { ring: "59,130,246",  edge: "130,195,255", body: "4,18,58"   },
  { ring: "99,102,241",  edge: "160,165,255", body: "12,12,68"  },
  { ring: "14,165,233",  edge: "70,210,255",  body: "2,32,68"   },
  { ring: "240,178,28",  edge: "255,218,80",  body: "48,33,3"   },
  { ring: "190,190,210", edge: "240,240,255", body: "22,22,38"  },
];

const DOT_POS: Record<number, [number,number][]> = {
  1: [[50,50]],
  2: [[30,30],[70,70]],
  3: [[25,25],[50,50],[75,75]],
  4: [[28,28],[72,28],[28,72],[72,72]],
  5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
  6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
};

type Kind = "card"|"chip"|"dice"|"coin";
interface Item {
  id:number; kind:Kind; top:number; dur:number; delay:number;
  scale:number; rot:number; blurBase:number;
  spinDur:number; spinDelay:number;
  suit?:string; value?:string;
  pal?: typeof CHIP_PAL[number];
  face?: number;
}

const SPIN_ANIM: Record<Kind, string> = {
  card:  "spin-card",
  chip:  "spin-chip",
  dice:  "spin-dice",
  coin:  "spin-chip",
};

function rng(seed:number){
  let v=seed;
  return ()=>{ v=(Math.imul(v,1664525)+1013904223)>>>0; return v/4294967296; };
}

function buildItems(): Item[] {
  const rand = rng(20260417);
  const r  = (a:number,b:number) => a+rand()*(b-a);
  const ri = (a:number,b:number) => Math.floor(r(a,b+1));
  const items: Item[] = [];
  let id = 0;

  for(let i=0;i<10;i++){
    const dur=r(22,44); const sd=r(5,10); const isBack=i%4===0;
    items.push({ id:id++, kind:"card", top:r(2,88), dur, delay:-r(0,dur),
      scale: isBack?r(0.35,0.55):r(0.65,1.10), rot:r(-30,30), blurBase:isBack?3:0,
      spinDur:sd, spinDelay:-r(0,sd),
      suit:SUITS[ri(0,3)], value:VALUES[ri(0,7)] });
  }
  for(let i=0;i<12;i++){
    const dur=r(20,46); const sd=r(1.5,3.5); const isBack=i%3===0;
    items.push({ id:id++, kind:"chip", top:r(3,90), dur, delay:-r(0,dur),
      scale: isBack?r(0.30,0.55):r(0.60,1.05), rot:r(-15,15), blurBase:isBack?4:0,
      spinDur:sd, spinDelay:-r(0,sd),
      pal:CHIP_PAL[ri(0,4)] });
  }
  for(let i=0;i<7;i++){
    const dur=r(24,48); const sd=r(2,5); const isBack=i%3===0;
    items.push({ id:id++, kind:"dice", top:r(5,85), dur, delay:-r(0,dur),
      scale: isBack?r(0.30,0.50):r(0.60,1.05), rot:r(-35,35), blurBase:isBack?3:0,
      spinDur:sd, spinDelay:-r(0,sd),
      face:ri(1,6) });
  }
  for(let i=0;i<9;i++){
    const dur=r(18,40); const sd=r(1.2,2.8); const isBack=i%3===0;
    items.push({ id:id++, kind:"coin", top:r(4,92), dur, delay:-r(0,dur),
      scale: isBack?r(0.28,0.52):r(0.55,0.95), rot:r(-20,20), blurBase:isBack?5:0,
      spinDur:sd, spinDelay:-r(0,sd) });
  }
  return items;
}

const ITEMS = buildItems();

function CardSVG({ suit, value, size }: { suit:string; value:string; size:number }) {
  const red = IS_RED[suit];
  const clr = red ? "#cc1111" : "#111111";
  return (
    <div style={{
      width:size, height:size*1.4, borderRadius:size*0.10,
      background:"#ffffff",
      border:`${size*0.025}px solid rgba(0,0,0,0.18)`,
      boxShadow:`0 ${size*0.06}px ${size*0.18}px rgba(0,0,0,0.35), 0 0 ${size*0.22}px rgba(0,0,0,0.15)`,
      display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center",
      position:"relative", overflow:"hidden",
    }}>
      <span style={{ position:"absolute", top:"4%", left:"7%", fontSize:size*0.20, fontWeight:900, color:clr, lineHeight:1 }}>{value}</span>
      <span style={{ position:"absolute", top:"20%", left:"8%", fontSize:size*0.16, color:clr, lineHeight:1 }}>{suit}</span>
      <span style={{ fontSize:size*0.46, lineHeight:1, color:clr }}>{suit}</span>
      <span style={{ position:"absolute", bottom:"4%", right:"7%", fontSize:size*0.20, fontWeight:900, color:clr, lineHeight:1, transform:"rotate(180deg)" }}>{value}</span>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"4%", background:"rgba(0,0,0,0.04)", borderRadius:`${size*0.10}px ${size*0.10}px 0 0` }}/>
    </div>
  );
}

function Chip3D({ size, pal, logoUrl }: { size:number; pal:typeof CHIP_PAL[number]; logoUrl?:string }) {
  const T    = Math.round(size * 0.20);
  const half = T / 2;
  const n    = 8;

  const mark = (i: number) => ({
    position: "absolute" as const,
    left: "50%", top: "50%",
    width: size * 0.11, height: size * 0.175,
    marginLeft: -(size * 0.055), marginTop: -(size * 0.0875),
    background: i % 2 === 0 ? `rgba(${pal.edge},0.95)` : `rgba(${pal.ring},0.28)`,
    borderRadius: size * 0.02,
    transform: `rotate(${i * 45}deg) translateY(-${size * 0.40}px)`,
  });

  const face = (front: boolean) => (
    <div style={{
      position:"absolute", width:size, height:size,
      transform: front
        ? `translateZ(${half + 0.5}px)`
        : `rotateY(180deg) translateZ(${half + 0.5}px)`,
      borderRadius:"50%", overflow:"hidden",
      background:`rgba(${pal.body},0.97)`,
      border:`2px solid rgba(${pal.ring},0.85)`,
      boxShadow:`inset 0 0 ${size*.12}px rgba(0,0,0,0.65)`,
    }}>
      {[0,1,2,3,4,5,6,7].map(i => <div key={i} style={mark(i)}/>)}
      <div style={{position:"absolute",inset:"18%",borderRadius:"50%",border:`1.5px solid rgba(${pal.ring},0.45)`}}/>
      <div style={{position:"absolute",inset:"27%",borderRadius:"50%",border:`1px dashed rgba(${pal.ring},0.28)`}}/>
      <div style={{
        position:"absolute",inset:"33%",borderRadius:"50%",
        background:`rgba(${pal.body},0.98)`,
        border:`1.5px solid rgba(${pal.ring},0.65)`,
        display:"flex",alignItems:"center",justifyContent:"center",
        overflow:"hidden",
      }}>
        {logoUrl
          ? <img src={logoUrl} style={{width:"78%",height:"78%",objectFit:"contain"}} alt=""/>
          : <span style={{fontSize:size*.19,color:`rgba(${pal.edge},0.95)`,fontWeight:"bold",fontFamily:"serif"}}>♠</span>
        }
      </div>
      {front && <div style={{position:"absolute",top:"8%",left:"12%",right:"30%",height:"25%",borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>}
    </div>
  );

  return (
    <>
      {Array.from({length: n}).map((_, i) => (
        <div key={i} style={{
          position:"absolute", width:size, height:size,
          transform:`translateZ(${-half + (i * T / (n - 1))}px)`,
          borderRadius:"50%",
          background: (i % 4 < 2) ? `rgba(${pal.edge},0.85)` : `rgba(${pal.body},0.92)`,
        }}/>
      ))}
      {face(true)}
      {face(false)}
    </>
  );
}

function DiceFace({ n, size }: { n:number; size:number }) {
  const dots = DOT_POS[n] ?? DOT_POS[1];
  const r    = size * 0.10;
  return (
    <div style={{
      position:"absolute", inset:0,
      background:"rgba(6,16,55,0.96)",
      border:`${size*0.025}px solid rgba(80,140,255,0.55)`,
      borderRadius:size*0.16,
      boxShadow:`inset 0 0 ${size*0.12}px rgba(0,0,40,0.7)`,
    }}>
      <div style={{
        position:"absolute", top:"8%", left:"10%", right:"10%", height:"10%",
        borderRadius:size*0.08,
        background:"rgba(120,170,255,0.10)",
      }}/>
      {dots.map(([x,y],i)=>(
        <div key={i} style={{
          position:"absolute",
          left:`${x}%`, top:`${y}%`,
          width:r*2, height:r*2,
          marginLeft:-r, marginTop:-r,
          borderRadius:"50%",
          background:"rgba(220,235,255,0.95)",
          boxShadow:"0 1px 3px rgba(0,0,0,0.6)",
        }}/>
      ))}
    </div>
  );
}

function Dice3D({ size }: { size:number }) {
  const half = size / 2;
  const faces: { n:number; tf:string }[] = [
    { n:1, tf:`translateZ(${half}px)` },
    { n:6, tf:`rotateY(180deg) translateZ(${half}px)` },
    { n:3, tf:`rotateY(90deg) translateZ(${half}px)` },
    { n:4, tf:`rotateY(-90deg) translateZ(${half}px)` },
    { n:2, tf:`rotateX(90deg) translateZ(${half}px)` },
    { n:5, tf:`rotateX(-90deg) translateZ(${half}px)` },
  ];
  return (
    <div style={{ width:size, height:size, position:"relative", transformStyle:"preserve-3d" }}>
      {faces.map(f=>(
        <div key={f.n} style={{ position:"absolute", width:size, height:size, transform:f.tf }}>
          <DiceFace n={f.n} size={size}/>
        </div>
      ))}
    </div>
  );
}

function CoinSVG({ size }: { size:number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display:"block" }}>
      <circle cx="50" cy="54" r="44" fill="rgba(100,65,3,0.70)"/>
      <circle cx="50" cy="50" r="46" fill="rgba(165,115,5,0.95)" stroke="rgba(255,210,50,0.85)" strokeWidth="2.5"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,225,80,0.40)" strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="30" fill="rgba(145,95,4,0.60)" stroke="rgba(255,215,60,0.30)" strokeWidth="1"/>
      <text x="50" y="63" textAnchor="middle" fontSize="34" fontWeight="bold"
        fill="rgba(255,220,60,0.95)" fontFamily="serif">$</text>
      <ellipse cx="37" cy="30" rx="12" ry="7" fill="rgba(255,255,255,0.18)"/>
    </svg>
  );
}

export default function CasinoBackground({ logoUrl = CHIP_LOGO_URL }: { logoUrl?: string }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex:0 }} aria-hidden="true">

      <div style={{ position:"absolute", inset:0, opacity:0.30 }}>
        {ITEMS.map(item => {
          const px = item.scale * 60;
          const f = item.blurBase > 0 ? `blur(${item.blurBase}px)` : undefined;
          return (
            <div
              key={item.id}
              style={{
                position:"absolute",
                left:"108%",
                top:`${item.top}%`,
                animation:`drift-left ${item.dur}s linear ${item.delay}s infinite`,
                willChange:"transform,opacity,filter",
              }}
            >
              <div style={{ transform:`scale(${item.scale})`, filter:f }}>
                {item.kind==="dice" ? (
                  <div style={{ perspective:"220px" }}>
                    <div style={{
                      animation:`spin-dice ${item.spinDur}s linear ${item.spinDelay}s infinite`,
                      transformStyle:"preserve-3d",
                    }}>
                      <Dice3D size={60}/>
                    </div>
                  </div>
                ) : item.kind==="chip" && item.pal ? (
                  <div style={{ perspective:"380px" }}>
                    <div style={{
                      width:60, height:60, position:"relative",
                      animation:`spin-chip ${item.spinDur}s linear ${item.spinDelay}s infinite`,
                      transformStyle:"preserve-3d",
                    }}>
                      <Chip3D size={60} pal={item.pal} logoUrl={logoUrl}/>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    animation:`${SPIN_ANIM[item.kind]} ${item.spinDur}s linear ${item.spinDelay}s infinite`,
                  }}>
                    {item.kind==="card" && item.suit && item.value &&
                      <CardSVG suit={item.suit} value={item.value} size={60}/>}
                    {item.kind==="coin" &&
                      <CoinSVG size={px}/>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 12%, rgba(0,0,0,0.60) 26%, rgba(0,0,0,0) 44%)",
      }}/>

    </div>
  );
}
