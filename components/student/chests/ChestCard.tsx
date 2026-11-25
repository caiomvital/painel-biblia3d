'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { Button, Card, CoinIcon } from '@/components/ui/game';
import { playSound } from '@/components/ui/game/sound-store';
import { kidsCall } from '../kids-api';
import { ChestArt, ChestOpening } from './ChestOpening';

type Chest = { id: string; label: string; source: string };

/** Baús conquistados e ainda fechados, mais a tela cheia de abertura (no body, acima da barra de abas). */
export function useChests(refreshKey: number, onOpened: () => void) {
  const [chests, setChests] = useState<Chest[]>([]);
  const [opening, setOpening] = useState<Chest | null>(null);

  const load = useCallback(async () => {
    try { setChests((await kidsCall('/api/kids/chests')).chests); } catch { /* o baú é opcional */ }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load, refreshKey]);

  const portal = opening ? createPortal(
    <ChestOpening chestId={opening.id} label={opening.label}
      onClose={(opened) => { setOpening(null); if (opened) onOpened(); void load(); }} />,
    document.body,
  ) : null;
  return { chests, openFirst: () => { if (chests[0]) setOpening(chests[0]); }, portal };
}
export type ChestControl = ReturnType<typeof useChests>;

const countText = (n: number) => (n === 1 ? 'Você tem 1 baú para abrir.' : `Você tem ${n} baús para abrir.`);

/** Cartão da tela inicial larga. Não aparece quando não há baú. */
export function ChestCard({ ctl }: { ctl: ChestControl }) {
  if (ctl.chests.length === 0) return null;
  return (
    <Card title="Baú conquistado!" tone="highlight" data-testid="home-chest">
      <p className="text-game-ink-dim">{countText(ctl.chests.length)} Dentro tem um item para o Lofi!</p>
      <Button className="mt-3" icon={<CoinIcon />} onClick={ctl.openFirst}>Abrir baú</Button>
    </Card>
  );
}

/** No celular o baú ocupa o lugar do Lofi: um botão com o desenho do baú, sem precisar rolar a tela. */
export function ChestButton({ ctl, className = '' }: { ctl: ChestControl; className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const n = ctl.chests.length;
  if (n === 0) return null;
  return (
    <button type="button" data-testid="home-chest" onClick={() => { playSound('tap'); ctl.openFirst(); }}
      aria-label={`Abrir baú. ${countText(n)}`}
      style={{ backgroundImage: 'linear-gradient(180deg,#ffbe4d 0%,#f1700e 100%)', borderColor: '#ffe1a8', ['--btn-edge' as string]: '#a8480a' }}
      className={`game-btn game-press game-glow relative flex w-full max-w-sm items-center justify-center gap-3 self-center px-4 py-2 rounded-[1.75rem] border-2 text-white font-[family-name:var(--font-game-body)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}>
      <ChestArt open={false} shaking={false} reduce={reduce} width="5.5rem" height="4.8rem" />
      <span className="text-left">
        <span className="block font-[family-name:var(--font-game-title)] text-2xl leading-none tracking-wide [text-shadow:0_2px_0_rgb(0_0_0/0.35)]">Abrir baú</span>
        <span className="mt-1 block text-sm font-semibold leading-tight [text-shadow:0_1px_2px_rgb(0_0_0/0.55)]">{n === 1 ? '1 baú esperando' : `${n} baús esperando`}</span>
      </span>
    </button>
  );
}

/** Detalhe da tela larga: quadradinho com um baú desenhado e, se houver baú, o número numa bola vermelha. Sem baú, fica apagado. */
export function ChestSquare({ ctl }: { ctl: ChestControl }) {
  const reduce = useReducedMotion() ?? false;
  const n = ctl.chests.length;
  const has = n > 0;
  return (
    <button type="button" disabled={!has} data-testid={has ? 'home-chest' : 'home-chest-empty'}
      onClick={() => { playSound('tap'); ctl.openFirst(); }}
      aria-label={has ? `Abrir baú. ${countText(n)}` : 'Nenhum baú para abrir agora'}
      style={has ? { backgroundImage: 'linear-gradient(180deg,#ffbe4d 0%,#f1700e 100%)', borderColor: '#ffe1a8', ['--btn-edge' as string]: '#a8480a' } : undefined}
      className={`game-btn game-press relative flex size-[4.5rem] shrink-0 items-center justify-center rounded-2xl border-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${has ? 'game-glow' : 'cursor-not-allowed border-game-line bg-game-surface-2 opacity-50 grayscale'}`}>
      <ChestArt open={false} shaking={false} reduce={reduce} width="3.4rem" height="3rem" />
      {has && (
        <span aria-hidden="true" className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border-2 border-white bg-red-600 text-sm font-bold text-white shadow">{n}</span>
      )}
    </button>
  );
}
