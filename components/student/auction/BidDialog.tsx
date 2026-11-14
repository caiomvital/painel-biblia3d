'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/game';
import type { AuctionItem } from '@/components/auction/AuctionSection';
import { friendlyBidError, itemEmoji } from './copy';

/** Janela de lance. Só visual: o valor vive no AuctionSection e a regra continua lá. */
export function BidDialog({ item, amount, balance, error, success, onAmount, onConfirm, onClose }: {
  item: AuctionItem; amount: number; balance: number; error: string | null; success: string | null;
  onAmount: (n: number) => void; onConfirm: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const quick: { label: string; value: number }[] = [
    { label: `Mínimo (${item.minNextBid})`, value: item.minNextBid },
    { label: '+100', value: item.currentBid + 100 },
    { label: '+250', value: item.currentBid + 250 },
  ];
  return (
    <dialog ref={ref} aria-label={`Dar lance: ${item.title}`} onCancel={onClose} data-testid="bid-dialog"
      className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-5 text-game-ink backdrop:bg-black/70">
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden="true" className="text-4xl">{itemEmoji(item.iconType)}</span>
        <h2 className="font-[family-name:var(--font-game-title)] text-2xl leading-tight">{item.title}</h2>
      </div>
      <dl className="mb-3 grid grid-cols-2 gap-2 rounded-game bg-game-bg p-3 text-sm">
        <div><dt className="text-game-ink-dim">Lance atual</dt><dd className="font-semibold">{item.currentBid} fichas</dd></div>
        <div><dt className="text-game-ink-dim">Você tem</dt><dd className="font-semibold">{balance} fichas</dd></div>
      </dl>
      {success && <p role="status" className="mb-3 rounded-game border-2 border-game-success p-3 font-semibold">{success}</p>}
      {error && <p role="alert" className="mb-3 rounded-game border-2 border-game-danger p-3 font-semibold">{friendlyBidError(error)}</p>}
      {amount < item.minNextBid && !error && (
        <p role="status" data-testid="bid-min-hint" className="mb-3 rounded-game border-2 border-game-primary p-3 font-semibold">O mínimo agora é {item.minNextBid} fichas.</p>
      )}
      <label className="block font-semibold">Seu lance (fichas)
        <input type="number" inputMode="numeric" value={amount} min={item.minNextBid} onChange={(e) => onAmount(Number(e.target.value))}
          className="mt-1 min-h-14 w-full rounded-game border-2 border-game-line bg-game-bg px-4 text-2xl font-semibold text-game-ink" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((q) => <Button key={q.label} variant="ghost" onClick={() => onAmount(q.value)}>{q.label}</Button>)}
      </div>
      <div className="mt-5 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button onClick={onConfirm} className="flex-1" data-testid="bid-confirm">Confirmar lance</Button>
      </div>
    </dialog>
  );
}
