'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/game';
import { eventCountdown, eventWhen } from '@/lib/event-format';
import { kidsCall } from '../kids-api';

export type KidEvent = { id: string; title: string; description: string | null; location: string | null; startsAt: string; className: string | null };
type Data = { upcoming: KidEvent[]; past: KidEvent[] };

function useEvents() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    kidsCall('/api/kids/events').then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);
  return { data, error };
}

function DateBadge({ iso, dim }: { iso: string; dim?: boolean }) {
  const w = eventWhen(iso);
  return (
    <div className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-game border-2 border-b-4 ${dim ? 'border-game-line bg-game-surface-2 text-game-ink-dim' : 'border-game-primary-deep bg-game-primary text-game-ink-on-light'}`}>
      <span className="text-xs font-bold uppercase leading-none">{w.month}</span>
      <span className="font-[family-name:var(--font-game-title)] text-3xl leading-none">{w.dayNumber}</span>
    </div>
  );
}

function EventRow({ e, past }: { e: KidEvent; past?: boolean }) {
  const w = eventWhen(e.startsAt);
  const when = past ? null : eventCountdown(e.startsAt);
  return (
    <li className="flex gap-3 rounded-game-lg border-2 border-game-line bg-game-surface p-3" data-testid={`event-${e.id}`}>
      <DateBadge iso={e.startsAt} dim={past} />
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-game-title)] text-xl leading-tight tracking-wide">{e.title}</p>
        <p className="text-base text-game-ink-dim">{w.weekday}, {w.time}{e.location ? ` · ${e.location}` : ''}</p>
        {e.description && <p className="mt-1 text-base">{e.description}</p>}
        <p className="mt-1 flex flex-wrap gap-2 text-sm font-bold">
          {when && <span className={`rounded-full px-2 py-0.5 ${when === 'Hoje' || when === 'Agora' ? 'bg-game-danger text-white' : 'bg-game-surface-2 text-game-ink'}`}>{when}</span>}
          <span className="rounded-full bg-game-surface-2 px-2 py-0.5 text-game-ink-dim">{e.className ?? 'Toda a escola'}</span>
        </p>
      </div>
    </li>
  );
}

/** Tela "Eventos": os próximos eventos da escola e da turma, e os últimos que já passaram. */
export function EventsScreen() {
  const { data, error } = useEvents();
  return (
    <div className="space-y-4" data-testid="events-screen">
      <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Eventos</h1>
      {error && <Card as="div" role="alert"><p className="font-semibold">{error}</p></Card>}
      {!data && !error && <p role="status" className="text-game-ink-dim">Carregando…</p>}
      {data && (
        <>
          {data.upcoming.length ? (
            <ul className="grid gap-3 xl:grid-cols-2">{data.upcoming.map((e) => <EventRow key={e.id} e={e} />)}</ul>
          ) : (
            <Card title="Nada marcado por enquanto"><p className="text-game-ink-dim">Quando a escola ou o professor marcar um evento, ele aparece aqui.</p></Card>
          )}
          {data.past.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-[family-name:var(--font-game-title)] text-xl tracking-wide text-game-ink-dim">Já aconteceram</h2>
              <ul className="grid gap-3 xl:grid-cols-2">{data.past.map((e) => <EventRow key={e.id} e={e} past />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Cartão da tela inicial: o próximo evento (só aparece se houver um nos próximos 14 dias). */
export function NextEventCard({ onOpen }: { onOpen: () => void }) {
  const { data } = useEvents();
  const next = data?.upcoming.find((e) => new Date(e.startsAt).getTime() < Date.now() + 14 * 86400000);
  if (!next) return null;
  const w = eventWhen(next.startsAt);
  return (
    <button type="button" onClick={onOpen} data-testid="home-next-event"
      className="game-press flex w-full items-center gap-3 rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-3 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white">
      <DateBadge iso={next.startsAt} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold uppercase text-game-ink-dim">Próximo evento · {eventCountdown(next.startsAt)}</span>
        <span className="block truncate font-[family-name:var(--font-game-title)] text-xl tracking-wide">{next.title}</span>
        <span className="block text-base text-game-ink-dim">{w.weekday}, {w.time}{next.location ? ` · ${next.location}` : ''}</span>
      </span>
    </button>
  );
}
