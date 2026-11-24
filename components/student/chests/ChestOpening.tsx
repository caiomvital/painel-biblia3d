'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Button, CoinIcon, ItemIcon, LiveMascot, RewardSummary, StarIcon, useGameSound } from '@/components/ui/game';
import { kidsCall } from '../kids-api';

export type OpenedChest = {
  item: { code: string; name: string; slot: string; rarity: string; rarityLabel: string };
  isNew: boolean;
  duplicateCoins: number;
};

/** Desenho próprio do baú (SVG). A tampa abre; com movimento reduzido só troca de estado. */
export function ChestArt({ open, shaking, reduce, width = '13rem', height = '11.4rem' }: { open: boolean; shaking: boolean; reduce: boolean; width?: string; height?: string }) {
  return (
    <motion.svg
      viewBox="0 0 160 140" width={width} height={height} aria-hidden="true" focusable="false"
      animate={reduce || !shaking ? { rotate: 0, x: 0 } : { rotate: [0, -5, 5, -6, 6, -3, 3, 0], x: [0, -4, 4, -4, 4, -2, 2, 0] }}
      transition={{ duration: 0.9 }}
    >
      <ellipse cx="80" cy="130" rx="58" ry="8" fill="#000" opacity="0.25" />
      {open && <circle cx="80" cy="60" r="46" fill="#ffd23f" opacity="0.35" />}
      <rect x="22" y="62" width="116" height="64" rx="10" fill="#8a4b1d" stroke="#15123a" strokeWidth="5" />
      <rect x="22" y="84" width="116" height="10" fill="#c27d00" />
      <g style={{ transformOrigin: '22px 62px', transform: open ? 'rotate(-62deg)' : 'rotate(0deg)', transition: reduce ? 'none' : 'transform 0.45s cubic-bezier(.3,1.6,.5,1)' }}>
        <path d="M22 62a58 36 0 0 1 116 0Z" fill="#a85d24" stroke="#15123a" strokeWidth="5" strokeLinejoin="round" />
        <path d="M22 62h116" stroke="#c27d00" strokeWidth="8" />
      </g>
      <rect x="68" y="72" width="24" height="28" rx="6" fill="#ffd23f" stroke="#15123a" strokeWidth="4" />
      <circle cx="80" cy="83" r="3.6" fill="#15123a" />
      <rect x="78" y="86" width="4" height="9" rx="2" fill="#15123a" />
    </motion.svg>
  );
}

/** Abertura do baú em tela cheia: toca, o servidor sorteia, a tampa abre, e o resultado sai na Tela de Resultado. */
export function ChestOpening({ chestId, label, onClose }: { chestId: string; label: string; onClose: (opened: boolean) => void }) {
  const reduce = useReducedMotion() ?? false;
  const { play } = useGameSound();
  const [phase, setPhase] = useState<'ready' | 'opening' | 'result'>('ready');
  const [result, setResult] = useState<OpenedChest | null>(null);
  const [error, setError] = useState('');
  const btn = useRef<HTMLButtonElement>(null);
  const openedRef = useRef(false);

  useEffect(() => { btn.current?.focus(); }, []);

  const open = async () => {
    if (phase !== 'ready') return;
    setPhase('opening'); setError(''); play('tap');
    try {
      // o resultado vem do servidor; a animação só espera ele (mínimo de suspense)
      const [r] = await Promise.all([
        kidsCall('/api/kids/chests', 'POST', { chestId }) as Promise<OpenedChest>,
        new Promise((res) => setTimeout(res, reduce ? 0 : 1100)),
      ]);
      openedRef.current = true;
      setResult(r); play('success');
      setTimeout(() => setPhase('result'), reduce ? 0 : 650);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o baú.');
      setPhase('ready');
    }
  };

  if (phase === 'result' && result) {
    const dup = !result.isNew;
    return (
      <RewardSummary
        title={dup ? 'ITEM REPETIDO' : 'NOVO ITEM!'}
        subtitle={`${result.item.name} · ${result.item.rarityLabel}`}
        items={[
          { label: result.item.name, icon: <ItemIcon code={result.item.code} size={2.2} />, value: 0, unit: 'item' },
          ...(dup ? [{ label: 'Bônus por item repetido', icon: <StarIcon />, value: result.duplicateCoins, unit: 'coins' as const }] : []),
        ]}
        totalCoins={result.duplicateCoins}
        hideTotal={!dup}
        onContinue={() => onClose(true)}
      />
    );
  }

  const opening = phase === 'opening' || phase === 'result';
  return (
    <div role="dialog" aria-modal="true" aria-label="Abrir baú" data-testid="chest-opening"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-[linear-gradient(160deg,#2a2f9e_0%,#4b2a9e_55%,#2b1a6e_100%)] px-4 py-10 text-center font-[family-name:var(--font-game-body)] text-game-ink">
      <p className="text-xl font-semibold">{label}</p>
      <LiveMascot size={5} cheering={opening && !reduce} />
      <ChestArt open={phase === 'result' || (phase === 'opening' && !!result)} shaking={phase === 'opening' && !result} reduce={reduce} />
      {phase === 'opening' ? <p role="status" className="text-2xl font-bold">Abrindo…</p> : (
        <Button ref={btn} size="lg" variant="primary" icon={<CoinIcon />} onClick={open} className="min-h-16 w-full max-w-xs text-2xl">Abrir baú</Button>
      )}
      {error && <p role="alert" className="max-w-xs rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</p>}
      {phase === 'ready' && <Button variant="ghost" onClick={() => onClose(openedRef.current)}>Agora não</Button>}
    </div>
  );
}
