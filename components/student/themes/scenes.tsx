'use client';
import React, { useId } from 'react';

/**
 * Cenários ilustrados dos temas (SVG desenhado em código, sem imagens): céu, colinas em camadas, ondas, estrelas e um
 * motivo de cada tema. Servem de fundo do painel inteiro (estilo "tema do Chrome") e de miniatura no seletor.
 * Tudo é determinístico (sem Math.random), então servidor e navegador desenham igual.
 */
const W = 1600;
const H = 900;

function rnd(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Silhueta ondulada (colinas, dunas, ondas) que preenche até o rodapé. */
function ridge(seed: number, base: number, amp: number, wl: number) {
  const r = rnd(seed);
  const p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
  let d = '';
  for (let x = 0; x <= W; x += 16) {
    const y = base + Math.sin(x / wl + p1) * amp + Math.sin(x / (wl * 0.45) + p2) * amp * 0.45 + Math.sin(x / (wl * 0.2) + p3) * amp * 0.18;
    d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
  }
  return `${d}L${W} ${H} L0 ${H} Z`;
}

function Stars({ n, seed, yMax, color = '#fff' }: { n: number; seed: number; yMax: number; color?: string }) {
  const r = rnd(seed);
  return <>{Array.from({ length: n }, (_, i) => {
    const x = r() * W, y = r() * yMax, s = 0.8 + r() * 2.2;
    return <circle key={i} cx={x.toFixed(0)} cy={y.toFixed(0)} r={s.toFixed(1)} fill={color} opacity={(0.35 + r() * 0.65).toFixed(2)} />;
  })}</>;
}

function Cloud({ x, y, s = 1, fill = '#fff', o = 1 }: { x: number; y: number; s?: number; fill?: string; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={o}>
      <ellipse cx="0" cy="0" rx="110" ry="34" /><ellipse cx="-60" cy="-22" rx="62" ry="40" /><ellipse cx="22" cy="-38" rx="70" ry="48" /><ellipse cx="78" cy="-14" rx="52" ry="34" />
    </g>
  );
}

function Pines({ seed, base, h, fill, o = 1 }: { seed: number; base: number; h: number; fill: string; o?: number }) {
  const r = rnd(seed);
  const out: React.ReactNode[] = [];
  for (let x = -20, i = 0; x < W + 40; x += 26 + r() * 40, i++) {
    const th = h * (0.6 + r() * 0.6), tw = th * 0.34;
    out.push(<polygon key={i} points={`${x},${base} ${x - tw},${base} ${x},${base - th} ${x + tw},${base}`} />);
    out.push(<polygon key={`b${i}`} points={`${x - tw * 0.8},${base - th * 0.35} ${x + tw * 0.8},${base - th * 0.35} ${x},${base - th * 1.08}`} />);
  }
  return <g fill={fill} opacity={o}><rect x="0" y={base - 4} width={W} height={H - base + 4} />{out}</g>;
}

type SceneProps = { id: string; tint?: [string, string] };

function Oceano({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d5f8a" /><stop offset="0.55" stopColor="#073e5f" /><stop offset="1" stopColor="#031a2b" /></linearGradient>
      <radialGradient id={`${u}b`} cx="0.62" cy="0" r="0.7"><stop offset="0" stopColor="#bff6ff" stopOpacity="0.9" /><stop offset="1" stopColor="#bff6ff" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} /><rect width={W} height={H} fill={`url(#${u}b)`} />
    {[0, 1, 2, 3, 4].map((i) => <polygon key={i} points={`${760 + i * 120},0 ${840 + i * 120},0 ${420 + i * 210},${H}  ${260 + i * 210},${H}`} fill="#d6fbff" opacity="0.06" />)}
    {[[300, 420, 1], [520, 560, 0.7], [1180, 380, 1.2], [1330, 520, 0.8], [900, 640, 0.9]].map(([x, y, s], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${s})`} fill={i % 2 ? '#ffb347' : '#37d6e6'}><ellipse rx="46" ry="20" /><polygon points="40,0 80,-22 80,22" /><circle cx="-26" cy="-4" r="4" fill="#031a2b" /></g>
    ))}
    {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={(i * 211) % W} cy={150 + ((i * 97) % 600)} r={4 + (i % 4) * 3} fill="none" stroke="#bff6ff" strokeWidth="2" opacity="0.4" />)}
    <path d={ridge(11, 640, 26, 190)} fill="#0b5c85" opacity="0.85" /><path d={ridge(12, 720, 24, 160)} fill="#07456a" /><path d={ridge(13, 800, 20, 220)} fill="#052f4a" />
  </>);
}

function Floresta({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#07201c" /><stop offset="0.7" stopColor="#1c5a45" /><stop offset="1" stopColor="#2f7d52" /></linearGradient>
      <radialGradient id={`${u}b`}><stop offset="0" stopColor="#fffbe0" /><stop offset="0.35" stopColor="#fffbe0" stopOpacity="0.5" /><stop offset="1" stopColor="#fffbe0" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${u}c`}><stop offset="0" stopColor="#f7ff9a" /><stop offset="1" stopColor="#f7ff9a" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} /><Stars n={60} seed={5} yMax={380} />
    <circle cx="1180" cy="200" r="230" fill={`url(#${u}b)`} /><circle cx="1180" cy="200" r="64" fill="#fffbe0" />
    <Pines seed={1} base={600} h={230} fill="#2c6e4a" o={0.55} /><Pines seed={2} base={690} h={270} fill="#17482f" o={0.9} /><Pines seed={3} base={790} h={320} fill="#0b2a1c" />
    {Array.from({ length: 26 }, (_, i) => <circle key={i} cx={(i * 173) % W} cy={420 + ((i * 131) % 380)} r="16" fill={`url(#${u}c)`} />)}
  </>);
}

function PorDoSol({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24093a" /><stop offset="0.35" stopColor="#7a2a5a" /><stop offset="0.65" stopColor="#ff7a59" /><stop offset="0.8" stopColor="#ffc27a" /><stop offset="1" stopColor="#ffe3a8" /></linearGradient>
      <radialGradient id={`${u}b`}><stop offset="0" stopColor="#fff7d1" /><stop offset="0.5" stopColor="#ffd07a" /><stop offset="1" stopColor="#ff9a4a" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} />
    <circle cx="800" cy="610" r="320" fill={`url(#${u}b)`} opacity="0.85" /><circle cx="800" cy="610" r="130" fill="#fff4c4" />
    {[[260, 300, 1.1], [1260, 240, 1.3], [980, 400, 0.8]].map(([x, y, s], i) => <Cloud key={i} x={x} y={y} s={s} fill="#ff9a8a" o={0.55} />)}
    {[[420, 210], [500, 250], [1150, 160]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q18 -18 36 0 q18 -18 36 0`} fill="none" stroke="#2a0c3a" strokeWidth="4" strokeLinecap="round" />)}
    <path d={ridge(21, 650, 30, 260)} fill="#6a2060" opacity="0.9" /><path d={ridge(22, 730, 36, 230)} fill="#47174f" /><path d={ridge(23, 810, 26, 280)} fill="#2a0c3a" />
  </>);
}

function Algodao({ u }: { u: string }) {
  const arcs = ['#ff6b8a', '#ffb454', '#ffe36b', '#7ee0a6', '#6bb8ff', '#b39bff'];
  return (<>
    <defs><linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe0ff" /><stop offset="0.6" stopColor="#f3d1f5" /><stop offset="1" stopColor="#ffe6f3" /></linearGradient></defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} />
    {arcs.map((c, i) => <circle key={c} cx="1180" cy="760" r={430 - i * 26} fill="none" stroke={c} strokeWidth="26" opacity="0.7" />)}
    <Cloud x={280} y={260} s={1.5} o={0.95} /><Cloud x={760} y={160} s={1} o={0.9} /><Cloud x={1380} y={330} s={1.2} o={0.95} /><Cloud x={620} y={480} s={0.9} o={0.85} />
    {Array.from({ length: 16 }, (_, i) => <path key={i} d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" transform={`translate(${(i * 223) % W} ${60 + ((i * 149) % 500)})`} fill="#fff" opacity="0.8" />)}
    <path d={ridge(31, 720, 30, 250)} fill="#ffc2e2" /><path d={ridge(32, 790, 26, 210)} fill="#c9f0e0" /><path d={ridge(33, 850, 18, 190)} fill="#ffb3d6" />
  </>);
}

function Espaco({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#03040b" /><stop offset="1" stopColor="#0d1030" /></linearGradient>
      <radialGradient id={`${u}n1`} cx="0.25" cy="0.35" r="0.5"><stop offset="0" stopColor="#7a3cff" stopOpacity="0.55" /><stop offset="1" stopColor="#7a3cff" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${u}n2`} cx="0.8" cy="0.2" r="0.45"><stop offset="0" stopColor="#22d3ee" stopOpacity="0.4" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${u}p`} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffd9a0" /><stop offset="0.55" stopColor="#e5737a" /><stop offset="1" stopColor="#5a2a7a" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} /><rect width={W} height={H} fill={`url(#${u}n1)`} /><rect width={W} height={H} fill={`url(#${u}n2)`} />
    <Stars n={170} seed={8} yMax={H} />
    <ellipse cx="1240" cy="320" rx="260" ry="50" fill="none" stroke="#ffe6b8" strokeWidth="14" opacity="0.5" transform="rotate(-18 1240 320)" />
    <circle cx="1240" cy="320" r="140" fill={`url(#${u}p)`} />
    <ellipse cx="1240" cy="320" rx="260" ry="50" fill="none" stroke="#ffe6b8" strokeWidth="14" opacity="0.8" strokeDasharray="0 330 600" transform="rotate(-18 1240 320)" />
    <circle cx="300" cy="640" r="52" fill="#cfd3ff" /><circle cx="282" cy="624" r="12" fill="#aeb3ee" /><circle cx="320" cy="660" r="9" fill="#aeb3ee" />
    <path d="M900 120 L560 300" stroke="#fff" strokeWidth="3" opacity="0.7" strokeLinecap="round" />
  </>);
}

function Eden({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a6b4a" /><stop offset="0.55" stopColor="#bcd66a" /><stop offset="1" stopColor="#ffe9a0" /></linearGradient>
      <radialGradient id={`${u}b`}><stop offset="0" stopColor="#fffbe0" /><stop offset="1" stopColor="#fffbe0" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} />
    {Array.from({ length: 9 }, (_, i) => <polygon key={i} points={`800,560 ${i * 200 - 100},0 ${i * 200 + 40},0`} fill="#fffbe0" opacity="0.1" />)}
    <circle cx="800" cy="560" r="260" fill={`url(#${u}b)`} /><circle cx="800" cy="560" r="80" fill="#fff7c4" />
    <path d={ridge(41, 600, 40, 300)} fill="#58a468" /><path d={ridge(42, 680, 34, 260)} fill="#3f8a50" />
    <path d="M700 900 C760 800 640 740 720 690 C800 640 820 600 900 560 L980 560 C900 620 880 650 810 700 C740 750 880 820 880 900 Z" fill="#7ec8e8" opacity="0.9" />
    <path d={ridge(43, 790, 26, 240)} fill="#2a6b3a" />
    <g transform="translate(1250 470)"><rect x="-16" y="40" width="32" height="200" rx="8" fill="#6b4a2a" />
      {[[-80, 20, 90], [70, 10, 100], [0, -50, 110], [-30, 40, 80], [50, 50, 80]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#3f9a50' : '#2f8044'} />)}
      {[[-70, 0], [50, -20], [10, -70], [-20, 50], [80, 40], [-90, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="11" fill="#e63946" />)}</g>
    {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 157) % W} cy={810 + ((i * 29) % 80)} r="5" fill={['#ffd23f', '#ff7eb6', '#fff'][i % 3]} />)}
  </>);
}

function Deserto({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f1535" /><stop offset="0.4" stopColor="#8a3d3a" /><stop offset="0.7" stopColor="#e69a4a" /><stop offset="1" stopColor="#ffd98a" /></linearGradient>
      <radialGradient id={`${u}b`}><stop offset="0" stopColor="#fff2c0" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} /><Stars n={40} seed={9} yMax={250} />
    <circle cx="420" cy="600" r="240" fill={`url(#${u}b)`} /><circle cx="420" cy="600" r="86" fill="#fff0bf" />
    <polygon points="900,640 1010,520 1090,560 1180,470 1300,640" fill="#8a5a3a" opacity="0.7" /><polygon points="1150,640 1260,540 1380,600 1500,520 1600,640" fill="#74482c" opacity="0.8" />
    <path d={ridge(51, 650, 34, 280)} fill="#c98a45" /><path d={ridge(52, 730, 40, 240)} fill="#a8672f" /><path d={ridge(53, 820, 28, 300)} fill="#6e4220" />
    <g transform="translate(1320 560)"><path d="M0 330 C-8 220 4 120 30 20" stroke="#4a2f16" strokeWidth="16" fill="none" strokeLinecap="round" />
      {[-70, -35, 0, 35, 70].map((a, i) => <path key={i} d="M30 20 C70 -30 130 -20 160 20" fill="none" stroke="#2f6b3a" strokeWidth="12" strokeLinecap="round" transform={`rotate(${a} 30 20)`} />)}</g>
    {[[560, 755], [610, 770], [655, 752], [700, 768]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="22" ry="14" fill="#fdf6e3" /><circle cx={x - 20} cy={y - 4} r="7" fill="#3a2a1a" /></g>)}
  </>);
}

function Arca({ u }: { u: string }) {
  const arcs = ['#ff5d73', '#ffa24a', '#ffe36b', '#5ed39a', '#5aa8ff', '#9a7bff'];
  return (<>
    <defs><linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2f4a" /><stop offset="0.5" stopColor="#4a7fb5" /><stop offset="0.85" stopColor="#ffd9a0" /><stop offset="1" stopColor="#ffe9c0" /></linearGradient></defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} />
    {arcs.map((c, i) => <circle key={c} cx="800" cy="760" r={520 - i * 24} fill="none" stroke={c} strokeWidth="24" opacity="0.65" />)}
    <Cloud x={240} y={220} s={1.3} fill="#aab8cc" o={0.8} /><Cloud x={1330} y={190} s={1.5} fill="#9fb0c8" o={0.8} /><Cloud x={700} y={110} s={1} fill="#b8c6da" o={0.7} />
    {Array.from({ length: 26 }, (_, i) => <line key={i} x1={(i * 71) % 520} y1={250 + ((i * 53) % 220)} x2={((i * 71) % 520) - 26} y2={290 + ((i * 53) % 220)} stroke="#cfe3ff" strokeWidth="3" opacity="0.5" />)}
    <path d={ridge(61, 760, 18, 180)} fill="#2f6aa0" opacity="0.9" />
    <g transform="translate(800 690)"><path d="M-250 -10 L250 -10 L200 70 L-200 70 Z" fill="#7a4a22" /><path d="M-250 -10 L250 -10 L236 14 L-236 14 Z" fill="#9a6230" />
      <rect x="-120" y="-90" width="240" height="82" fill="#b07a3a" /><polygon points="-140,-90 0,-170 140,-90" fill="#6b3f1c" />
      {[-80, -30, 20, 70].map((x) => <rect key={x} x={x} y="-64" width="26" height="30" rx="4" fill="#ffe08a" />)}</g>
    <path d={ridge(62, 800, 22, 160)} fill="#1f5584" /><path d={ridge(63, 850, 16, 140)} fill="#16406a" />
    <g transform="translate(1120 260)"><ellipse rx="34" ry="14" fill="#fff" /><path d="M-6 -4 C20 -50 60 -40 70 -20 C40 -22 20 -10 6 0 Z" fill="#fff" /><circle cx="-30" cy="-4" r="3" fill="#333" /><path d="M-34 4 q-30 14 -52 6" stroke="#4a8a3a" strokeWidth="5" fill="none" strokeLinecap="round" /></g>
  </>);
}

function Neon({ u }: { u: string }) {
  const hs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => 560 + Math.pow(i, 1.9) * 9);
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#07060f" /><stop offset="0.7" stopColor="#2a0a4a" /><stop offset="1" stopColor="#5a1260" /></linearGradient>
      <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffee00" /><stop offset="1" stopColor="#ff2bd6" /></linearGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} /><Stars n={60} seed={4} yMax={420} />
    <circle cx="800" cy="450" r="210" fill={`url(#${u}s)`} />
    {[470, 510, 548, 584].map((y, i) => <rect key={y} x="560" y={y} width="480" height={5 + i * 3} fill="#2a0a4a" />)}
    <polyline points="0,560 160,470 300,540 440,430 600,560" fill="none" stroke="#00f0ff" strokeWidth="4" /><polyline points="1000,560 1160,440 1280,520 1420,420 1600,560" fill="none" stroke="#00f0ff" strokeWidth="4" />
    <rect y="560" width={W} height={H - 560} fill="#12041f" />
    {hs.map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#ff2bd6" strokeWidth="2" opacity="0.7" />)}
    {Array.from({ length: 21 }, (_, i) => <line key={i} x1="800" y1="560" x2={800 + (i - 10) * 230} y2={H} stroke="#ff2bd6" strokeWidth="2" opacity="0.6" />)}
  </>);
}

function ReinoOuro({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a1c05" /><stop offset="0.5" stopColor="#8a6212" /><stop offset="1" stopColor="#ffd23f" /></linearGradient>
      <radialGradient id={`${u}b`}><stop offset="0" stopColor="#fff6c0" /><stop offset="1" stopColor="#fff6c0" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} />
    {Array.from({ length: 12 }, (_, i) => <polygon key={i} points={`800,540 ${i * 150 - 150},0 ${i * 150 - 90},0`} fill="#fff6c0" opacity="0.12" />)}
    <circle cx="800" cy="540" r="300" fill={`url(#${u}b)`} />
    <path d={ridge(71, 700, 26, 280)} fill="#5a3f0a" opacity="0.9" />
    <g fill="#241703" transform="translate(800 520)">
      <rect x="-180" y="40" width="360" height="200" />{[-170, -120, -70, 70, 120, 150].map((x) => <rect key={x} x={x} y="22" width="22" height="22" />)}
      <rect x="-60" y="-60" width="120" height="110" />{[-60, -26, 8, 42].map((x) => <rect key={x} x={x} y="-80" width="18" height="22" />)}
      <rect x="-230" y="-20" width="70" height="260" /><polygon points="-240,-20 -195,-120 -150,-20" /><rect x="160" y="-20" width="70" height="260" /><polygon points="150,-20 195,-120 240,-20" />
      <rect x="-3" y="-180" width="6" height="120" /><polygon points="3,-180 70,-160 3,-138" fill="#ffd23f" /><path d="M-30 240 L-30 150 Q0 100 30 150 L30 240 Z" fill="#ffb21f" /></g>
    <path d={ridge(72, 800, 22, 250)} fill="#3a2706" /><path d={ridge(73, 860, 16, 200)} fill="#241703" />
    {Array.from({ length: 24 }, (_, i) => <path key={i} d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" transform={`translate(${(i * 197) % W} ${40 + ((i * 113) % 460)})`} fill="#fff3b0" opacity="0.85" />)}
  </>);
}

function Aurora({ u }: { u: string }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#020c18" /><stop offset="1" stopColor="#0a2a3a" /></linearGradient>
      <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3fe0a0" /><stop offset="0.5" stopColor="#6ee7b7" /><stop offset="1" stopColor="#a78bfa" /></linearGradient>
      <filter id={`${u}f`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="22" /></filter>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} /><Stars n={120} seed={6} yMax={500} />
    <g filter={`url(#${u}f)`} fill={`url(#${u}g)`}>
      <path d="M-50 330 C250 120 480 380 760 200 C1040 20 1260 300 1650 120 L1650 260 C1260 420 1040 200 760 380 C480 560 250 320 -50 500 Z" opacity="0.7" />
      <path d="M-50 470 C300 300 560 520 860 340 C1100 200 1340 420 1650 300 L1650 380 C1340 520 1100 330 860 450 C560 620 300 430 -50 560 Z" opacity="0.45" />
    </g>
    <path d={ridge(81, 640, 90, 300)} fill="#0b2a40" /><path d={ridge(82, 730, 60, 260)} fill="#08202f" />
    <path d="M0 780 L1600 780 L1600 900 L0 900 Z" fill="#06182a" /><path d="M0 800 L1600 800" stroke="#6ee7b7" strokeWidth="2" opacity="0.4" />
    <Pines seed={83} base={820} h={140} fill="#04121f" />
  </>);
}

function Galaxia({ u }: { u: string }) {
  return (<>
    <defs>
      <radialGradient id={`${u}a`} cx="0.5" cy="0.45" r="0.8"><stop offset="0" stopColor="#3a1480" /><stop offset="0.6" stopColor="#12062a" /><stop offset="1" stopColor="#07021a" /></radialGradient>
      <radialGradient id={`${u}c`}><stop offset="0" stopColor="#fff6d8" /><stop offset="0.25" stopColor="#ff8bd8" stopOpacity="0.8" /><stop offset="1" stopColor="#7b3cff" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${u}e`}><stop offset="0" stopColor="#ff8bd8" stopOpacity="0.8" /><stop offset="1" stopColor="#ff8bd8" stopOpacity="0" /></radialGradient>
      <filter id={`${u}f`}><feGaussianBlur stdDeviation="16" /></filter>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} />
    <g filter={`url(#${u}f)`} opacity="0.7"><circle cx="300" cy="200" r="200" fill="#7b3cff" opacity="0.5" /><circle cx="1350" cy="680" r="240" fill="#ff4fb8" opacity="0.35" /></g>
    <g transform="translate(800 440) rotate(-24)">
      {[0, 1, 2, 3].map((i) => <ellipse key={i} rx={560 - i * 90} ry={150 - i * 24} fill="none" stroke={['#ff8bd8', '#b08bff', '#7cc4ff', '#ffe08a'][i]} strokeWidth={26 - i * 4} opacity={0.35 + i * 0.05} filter={`url(#${u}f)`} />)}
      <ellipse rx="300" ry="90" fill={`url(#${u}c)`} /></g>
    <Stars n={200} seed={14} yMax={H} />
    {[[260, 700], [1360, 180], [620, 130]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><circle r="40" fill={`url(#${u}e)`} /><path d="M-34 0 H34 M0 -34 V34" stroke="#fff" strokeWidth="2" opacity="0.8" /></g>)}
  </>);
}

function LofiScene({ u, tint }: { u: string; tint: [string, string] }) {
  return (<>
    <defs>
      <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#15123a" /><stop offset="1" stopColor={tint[1]} stopOpacity="0.8" /></linearGradient>
      <filter id={`${u}f`}><feGaussianBlur stdDeviation="40" /></filter>
    </defs>
    <rect width={W} height={H} fill={`url(#${u}a)`} />
    <g filter={`url(#${u}f)`}><circle cx="300" cy="220" r="260" fill={tint[0]} opacity="0.55" /><circle cx="1300" cy="640" r="320" fill={tint[0]} opacity="0.4" /><circle cx="900" cy="140" r="160" fill="#fff" opacity="0.15" /></g>
    <Stars n={60} seed={3} yMax={H} />
  </>);
}

export function hasScene(id: string) { return id !== 'padrao'; }

/** Desenha o cenário do tema ocupando toda a caixa (corta nas bordas, como um papel de parede). */
export function ThemeScene({ id, tint, className }: SceneProps & { className?: string }) {
  const u = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const t = tint ?? ['#5ad1ff', '#2b8fc4'];
  const body = {
    oceano: <Oceano u={u} />, floresta: <Floresta u={u} />, 'por-do-sol': <PorDoSol u={u} />, algodao: <Algodao u={u} />, espaco: <Espaco u={u} />,
    'jardim-eden': <Eden u={u} />, 'deserto-davi': <Deserto u={u} />, 'arca-noe': <Arca u={u} />, neon: <Neon u={u} />,
    'reino-ouro': <ReinoOuro u={u} />, aurora: <Aurora u={u} />, galaxia: <Galaxia u={u} />, lofi: <LofiScene u={u} tint={t} />,
  }[id];
  if (!body) return <div className={className} style={{ background: '#15123a' }} aria-hidden />;
  return <svg aria-hidden className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">{body}</svg>;
}
