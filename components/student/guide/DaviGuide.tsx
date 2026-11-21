'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { daviMessage, type DaviContext, type DaviMood } from '@/lib/davi-guide';
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

const SHOW_MS = 8000;
const SEEN_KEY = 'b3d-davi-visto';

/** Quando o Davi aparece: ao entrar (uma vez por fala, por sessão), ao ganhar pontos, e quando o aluno chama tocando no Lofi. Fora disso, não existe na tela. */
export function useDaviMoments(ctx: DaviContext) {
  const enabled = useDaviGuide();
  const [shown, setShown] = useState<{ text: string; mood: DaviMood; id: number } | null>(null);
  const idRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const message = daviMessage(ctx);
  const msgRef = useRef(message);
  useEffect(() => { msgRef.current = message; });

  const show = useCallback((m: { text: string; mood: DaviMood }, ms = SHOW_MS) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    idRef.current += 1;
    setShown({ ...m, id: idRef.current });
    hideTimer.current = setTimeout(() => setShown(null), ms);
  }, []);
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  // ao abrir a Home: só se há algo útil a dizer e ainda não disse nesta sessão
  useEffect(() => {
    if (!enabled) return;
    const m = msgRef.current;
    if (m.mood === 'feliz' && !ctx.lessonOpen && !ctx.quizPending) return;
    let seen = '';
    try { seen = window.sessionStorage.getItem(SEEN_KEY) ?? ''; } catch { /* sem armazenamento: fala de novo */ }
    if (seen === m.text) return;
    try { window.sessionStorage.setItem(SEEN_KEY, m.text); } catch { /* ignora */ }
    const t = setTimeout(() => show(m), 600);
    return () => clearTimeout(t);
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // ao ganhar pontos
  useEffect(() => {
    if (!enabled || !ctx.celebrate) return;
    const t = setTimeout(() => show(msgRef.current, 5000), 0);
    return () => clearTimeout(t);
  }, [ctx.celebrate, enabled, show]);

  const call = useCallback(() => { if (enabled) show(msgRef.current); }, [enabled, show]);
  return { visible: enabled && !!shown, text: shown?.text ?? '', mood: shown?.mood ?? 'feliz', call, enabled };
}

/** O Davi em si: pequeno, animado, com entrada suave. */
export function DaviSprite({ mood }: { mood: DaviMood }) {
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
    </div>
  );
}

/** A fala, no lugar da frase fixa abaixo da saudação. */
export function DaviBubble({ text }: { text: string }) {
  return (
    <div role="status" className="davi-in-fade flex flex-col items-center rounded-2xl border-2 border-b-4 border-game-line bg-game-surface px-3 py-1.5 text-center text-base font-semibold leading-snug text-game-ink">
      <span><span className="text-game-primary">Davi: </span>{text}</span>
      <button type="button" onClick={() => setDaviGuide(false)} data-testid="davi-silence"
        className="text-xs font-normal text-game-ink-dim underline focus-visible:outline-2 focus-visible:outline-white">
        Silenciar o Davi
      </button>
    </div>
  );
}
