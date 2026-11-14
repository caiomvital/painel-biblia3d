'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/game';
import type { StudentAuctionItemBidSummary } from '@/components/auction/AuctionSection';
import { AUCTION_TEXT as T, itemEmoji } from './copy';
import { StatusBadge } from './StatusBadge';

type Filter = 'all' | 'active' | 'finished';

/** Meus lances: agrupados em "Ativos" e "Encerrados". O filtro e o histórico aberto são estado só visual. */
export function MyBidsList({ bids }: { bids: StudentAuctionItemBidSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const active = bids.filter((b) => b.itemStatus !== 'FINISHED');
  const finished = bids.filter((b) => b.itemStatus === 'FINISHED');
  const shown = filter === 'active' ? active : filter === 'finished' ? finished : bids;

  if (bids.length === 0) return <p className="py-8 text-center text-game-ink-dim">{T.noBids}</p>;
  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="group" aria-label="Filtrar lances">
        {([['all', 'Todos'], ['active', 'Ativos'], ['finished', 'Acabaram']] as const).map(([v, label]) => (
          <Button key={v} variant={filter === v ? 'primary' : 'ghost'} aria-pressed={filter === v} onClick={() => setFilter(v)}>{label}</Button>
        ))}
      </div>
      {shown.map((b) => (
        <article key={b.itemId} data-testid={`my-bid-${b.itemId}`} className="rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-3xl">{itemEmoji(b.itemIconType)}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-[family-name:var(--font-game-title)] text-xl leading-tight">{b.itemTitle}</h3>
              <div className="mt-1"><StatusBadge status={b.studentStatus} /></div>
            </div>
          </div>
          <p className="mt-3 text-sm text-game-ink-dim">
            Seu lance: <strong className="text-game-ink">{b.studentLastBid} fichas</strong>
            {b.studentStatus === 'LIDERANDO' && b.reservedCoins > 0 && <> · Guardadas: <strong className="text-game-ink">{b.reservedCoins}</strong></>}
            {b.studentStatus === 'SUPERADO' && b.hasReleasedReservation && <> · Fichas de volta</>}
            {b.studentStatus === 'ARREMATADO' && typeof b.spentCoins === 'number' && <> · Gastou: <strong className="text-game-ink">{b.spentCoins}</strong></>}
          </p>
          {b.bidsHistory.length > 0 && (
            <>
              <Button variant="ghost" className="mt-3" aria-expanded={open === b.itemId} onClick={() => setOpen(open === b.itemId ? null : b.itemId)}>
                {open === b.itemId ? 'Esconder lances' : `Ver meus lances (${b.bidsHistory.length})`}
              </Button>
              {open === b.itemId && (
                <ul className="mt-2 space-y-1 text-sm">
                  {b.bidsHistory.map((h) => (
                    <li key={h.id} className="flex justify-between rounded-game bg-game-bg px-3 py-2">
                      <span>{h.amount} fichas</span>
                      <span className="text-game-ink-dim">{new Date(h.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </article>
      ))}
    </div>
  );
}
