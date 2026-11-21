'use client';

import React, { useEffect, useState } from 'react';
import { daviMessage, type DaviContext } from '@/lib/davi-guide';
import { setDaviGuide, useDaviGuide } from './useDaviGuide';
import './davi.css';

/** Peças do Davi em um palco de 700 x 960. Cada linha: arquivo, esquerda, topo, largura (em pixels do palco). */
const BODY: Array<[string, number, number, number]> = [
  ['perna-e', 262, 690, 148], ['perna-d', 352, 690, 148], ['bota-e', 236, 792, 150], ['bota-d', 364, 792, 150],
  ['tronco', 221, 430, 258], ['alca', 241, 445, 231], ['bolsa', 205, 590, 200],
];
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const place = (x: number, y: number, w: number): React.CSSProperties => ({ left: pct(x, 700), top: pct(y, 960), width: pct(w, 700) });

function Arm({ side }: { side: 'e' | 'd' }) {
  const left = side === 'e' ? 150 : 402;
  return (
    <div className={`davi-arm davi-arm-${side}`} style={place(left, 455, 148)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/davi/braco-${side}.png`} alt="" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/davi/munheq-${side}.png`} alt="" draggable={false} className="davi-wrist"
        style={{ left: side === 'e' ? '5%' : '38%', top: '55%', width: '57%', rotate: side === 'e' ? '-30deg' : '30deg' }} />
    </div>
  );
}

/** Davi: guia pequeno no canto da tela inicial. Fala poucas frases, nunca interrompe o aluno e pode ser silenciado. */
export function DaviGuide(ctx: DaviContext) {
  const enabled = useDaviGuide();
  const { text, mood } = daviMessage(ctx);
  const [hiddenText, setHiddenText] = useState<string | null>(null);
  const [blink, setBlink] = useState(false);

  // a fala aparece quando muda e some sozinha depois de alguns segundos
  useEffect(() => {
    const t = setTimeout(() => setHiddenText(text), 9000);
    return () => clearTimeout(t);
  }, [text]);
  const bubble = hiddenText !== text;
  // pisca de tempos em tempos
  useEffect(() => {
    if (mood !== 'feliz') return;
    let off: ReturnType<typeof setTimeout>;
    const loop = setInterval(() => { setBlink(true); off = setTimeout(() => setBlink(false), 130); }, 3600);
    return () => { clearInterval(loop); clearTimeout(off); };
  }, [mood]);

  if (!enabled) return null;
  const face = blink ? 'dormindo' : mood;

  return (
    <div className="flex items-end justify-center gap-2" data-testid="davi-guide">
      <button type="button" onClick={() => setHiddenText(bubble ? text : null)} aria-label="Davi, seu guia. Toque para ouvir de novo"
        className={`davi relative block w-[4.75rem] shrink-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${mood === 'comemorando' ? 'davi-cheer' : ''}`}
        style={{ aspectRatio: '700 / 960' }}>
        <span className="davi-bob absolute inset-0">
          {BODY.slice(0, 4).map(([n, x, y, w]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={n} src={`/davi/${n}.png`} alt="" draggable={false} className="absolute h-auto" style={place(x, y, w)} />
          ))}
          <Arm side="e" />
          {BODY.slice(4).map(([n, x, y, w]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={n} src={`/davi/${n}.png`} alt="" draggable={false} className="absolute h-auto" style={place(x, y, w)} />
          ))}
          <Arm side="d" />
          <span className="davi-head absolute" style={{ left: pct(99, 700), top: pct(40, 960), width: pct(502, 700) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/davi/rosto-${face}.png`} alt="" draggable={false} className="block h-auto w-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/davi/faixa.png" alt="" draggable={false} className="absolute h-auto" style={{ left: '17.5%', top: '22.8%', width: '64.7%' }} />
          </span>
        </span>
      </button>
      {bubble && (
        <div role="status" className="relative mb-8 max-w-[14rem] rounded-2xl border-2 border-b-4 border-game-line bg-game-surface px-3 py-2 text-sm font-semibold leading-snug text-game-ink">
          {text}
          <button type="button" onClick={() => setDaviGuide(false)} data-testid="davi-silence"
            className="mt-1 block text-xs font-normal text-game-ink-dim underline focus-visible:outline-2 focus-visible:outline-white">
            Silenciar o Davi
          </button>
          <span aria-hidden className="absolute -left-1.5 bottom-3 size-3 rotate-45 border-b-2 border-l-2 border-game-line bg-game-surface" />
        </div>
      )}
    </div>
  );
}
