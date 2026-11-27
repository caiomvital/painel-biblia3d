'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { DaviMood } from '@/lib/davi-guide';
import { createTapCounter, daviJoke } from '@/lib/easter-eggs';
import { HEAD_FIT, TUNIC_FIT, partFile } from '@/lib/davi-parts';
import type { MascotLook } from '@/lib/mascot-look';
import { useMascotLook } from '@/components/ui/game/Mascot';
import { setDaviGuide, useDaviGuide } from './useDaviGuide';
import './davi.css';

/** Peças do Davi em um palco de 700 x 960. Cada linha: arquivo, esquerda, topo, largura (em pixels do palco). */
const BODY: Array<[string, number, number, number]> = [
  ['perna-e', 262, 690, 148], ['perna-d', 352, 690, 148], ['bota-e', 232, 790, 164], ['bota-d', 372, 790, 164],
  ['tronco', 221, 430, 258], ['alca', 241, 445, 231], ['bolsa', 205, 590, 200],
];
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const place = (x: number, y: number, w: number): React.CSSProperties => ({ left: pct(x, 700), top: pct(y, 960), width: pct(w, 700) });

function Arm({ side, wrist }: { side: 'e' | 'd'; wrist: string | null }) {
  const left = side === 'e' ? 136 : 416;
  return (
    <div className={`davi-arm davi-arm-${side}`} style={place(left, 455, 148)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/davi/braco-${side}.png`} alt="" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={wrist ? `/davi/${wrist}-${side}.png` : `/davi/munheq-${side}.png`} alt="" draggable={false} className="davi-wrist"
        style={{ left: side === 'e' ? '14%' : '29%', top: '53%', width: '57%', rotate: side === 'e' ? '18deg' : '-18deg' }} />
    </div>
  );
}

/** O Davi em si: pequeno, animado, com entrada suave. */
export function DaviSprite({ mood, look }: { mood: DaviMood; look?: MascotLook }) {
  const ctx = useMascotLook();
  const worn = look ?? ctx;
  const head = partFile('daviHead', worn.daviHead);
  const tunic = partFile('daviTunic', worn.daviTunic);
  const boots = partFile('daviBoots', worn.daviBoots);
  const wrist = partFile('daviWrists', worn.daviWrists);
  const headFit = head ? HEAD_FIT[head] : null;
  const tunicFit = tunic ? TUNIC_FIT(tunic) : null;
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (mood !== 'feliz') return;
    let off: ReturnType<typeof setTimeout>;
    const loop = setInterval(() => { setBlink(true); off = setTimeout(() => setBlink(false), 130); }, 3600);
    return () => { clearInterval(loop); clearTimeout(off); };
  }, [mood]);
  const face = blink ? 'dormindo' : mood;
  return (
    <div className={`davi davi-in relative block w-full ${mood === 'comemorando' ? 'davi-cheer' : ''}`} style={{ aspectRatio: '700 / 960' }} data-testid="davi-guide" aria-hidden>
      <span className="davi-bob absolute inset-0">
        {BODY.slice(0, 2).map(([n, x, y, w]) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={n} src={`/davi/${n}.png`} alt="" draggable={false} className="absolute h-auto" style={place(x, y, w)} />
        ))}
        {boots ? (['e', 'd'] as const).map((k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`b${k}`} src={`/davi/${boots}-${k}.png`} alt="" draggable={false} className="absolute h-auto" style={place(k === 'e' ? 236 : 364, 792, 150)} />
        )) : BODY.slice(2, 4).map(([n, x, y, w]) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={n} src={`/davi/${n}.png`} alt="" draggable={false} className="absolute h-auto" style={place(x, y, w)} />
        ))}
        <Arm side="e" wrist={wrist} />
        <Arm side="d" wrist={wrist} />
        {BODY.slice(4).map(([n, x, y, w]) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={n} src={n === 'tronco' && tunic && tunicFit ? `/davi/${tunic}.png` : `/davi/${n}.png`} alt="" draggable={false} className="absolute h-auto"
            style={n === 'tronco' && tunicFit ? place(tunicFit.x, tunicFit.y, tunicFit.w) : place(x, y, w)} />
        ))}
        <span className="davi-head absolute" style={{ left: pct(99, 700), top: pct(40, 960), width: pct(502, 700) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/davi/rosto-${face}.png`} alt="" draggable={false} className="block h-auto w-full" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {headFit && head ? (
            <img src={`/davi/${head}.png`} alt="" draggable={false} className="absolute h-auto"
              style={{ left: `${((502 - headFit.natW * headFit.scale) / 2 / 502) * 100}%`, top: `${(headFit.top / 415) * 100}%`, width: `${(headFit.natW * headFit.scale / 502) * 100}%` }} />
          ) : (
            <img src="/davi/faixa.png" alt="" draggable={false} className="absolute h-auto" style={{ left: '17.5%', top: '22.8%', width: '64.7%' }} />
          )}
        </span>
      </span>
    </div>
  );
}

/** A fala, no lugar da frase fixa abaixo da saudação. */
export function DaviBubble({ text }: { text: string }) {
  return (
    <div role="status" className="davi-in-fade flex flex-col items-center rounded-2xl border-2 border-b-4 border-game-line bg-game-surface px-3 py-1.5 text-center text-base font-semibold leading-snug text-game-ink">
      <span><span className="text-game-primary">Davi: </span>{text}</span>
      <button type="button" onClick={() => setDaviGuide(false)} data-testid="davi-silence"
        className="min-h-9 px-2 text-sm font-normal text-game-ink-dim underline focus-visible:outline-2 focus-visible:outline-white">
        Silenciar o Davi
      </button>
    </div>
  );
}

/**
 * O tutor em ação: o Davi pequeno com a fala ao lado. Some se o aluno silenciou o Davi.
 * Easter egg: 5 toques seguidos no Davi e ele conta uma piada (uma diferente a cada vez, só diversão).
 */
export function DaviTutor({ text, mood, className = '' }: { text: string; mood: DaviMood; className?: string }) {
  const enabled = useDaviGuide();
  const [joke, setJoke] = useState<string | null>(null);
  const turn = useRef(0);
  const fiveTaps = useRef(createTapCounter(5, 1500));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!enabled) return null;
  const onSpriteTap = () => {
    if (!fiveTaps.current()) return;
    setJoke(daviJoke(turn.current++));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJoke(null), 9000);
  };
  return (
    <div className={`flex items-end gap-2 ${className}`} data-testid="davi-tutor">
      <div className="w-14 shrink-0" onClick={onSpriteTap} data-testid="davi-sprite"><DaviSprite mood={joke ? 'comemorando' : mood} /></div>
      <div className="mb-2 min-w-0 flex-1 [&>div]:items-start [&>div]:text-left"><DaviBubble text={joke ?? text} /></div>
    </div>
  );
}
