'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button, LiveMascot } from '@/components/ui/game';
import type { StudentAuctionItemBidSummary } from '@/components/auction/AuctionSection';

const KEY = 'biblia3d:auction-won-seen';

function readSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function writeSeen(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(-50))); } catch { /* sem armazenamento: avisa de novo na próxima visita */ }
}

/** Comemora cada prêmio ganho uma única vez (lembra no navegador). Sem movimento com movimento reduzido. */
export function WinCelebration({ bids }: { bids: StudentAuctionItemBidSummary[] }) {
  const reduce = useReducedMotion();
  const [seen, setSeen] = useState<string[]>(readSeen);
  const wins = useMemo(() => bids.filter((b) => b.studentStatus === 'ARREMATADO' && !seen.includes(b.itemId)), [bids, seen]);
  const win = wins[0];
  const dismiss = () => {
    if (!win) return;
    const next = [...seen, win.itemId];
    writeSeen(next);
    setSeen(next);
  };
  return (
    <AnimatePresence>
      {win && (
        <motion.div key={win.itemId} role="alertdialog" aria-label="Você ganhou um prêmio" data-testid="auction-win"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }} animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }} transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-game-lg border-2 border-b-4 border-game-coin bg-game-surface p-6 text-center text-game-ink">
            <LiveMascot cheering size={8} />
            <h2 className="font-[family-name:var(--font-game-title)] text-3xl">Você ganhou!</h2>
            <p className="text-xl">{win.itemTitle}</p>
            <Button size="lg" onClick={dismiss}>Legal!</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
