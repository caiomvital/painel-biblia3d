'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, ItemIcon, LiveMascot, MASCOT_NAME } from '@/components/ui/game';
import { LOOK_KEYS, SLOT_OF_KEY, type LookKey, type MascotLook } from '@/lib/mascot-look';
import { kidsCall } from '../kids-api';

type Item =
  | { owned: true; code: string; name: string; slot: string; rarity: string; rarityLabel: string }
  | { owned: false; slot: string };
type Collection = { items: Item[]; total: number; ownedCount: number; look: MascotLook };

const TITLE: Record<LookKey, string> = { color: 'Cor', accessory: 'Acessório', background: 'Fundo', frame: 'Moldura' };
const sameLook = (a: MascotLook, b: MascotLook) => LOOK_KEYS.every((k) => (a[k] ?? '') === (b[k] ?? ''));

/** "Meu Lofi": prévia antes de salvar e a coleção (itens ganhos e silhuetas dos que faltam, sem mostrar chances). */
export function WardrobeScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [col, setCol] = useState<Collection | null>(null);
  const [draft, setDraft] = useState<MascotLook>({});
  const [saved, setSaved] = useState<MascotLook>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const c: Collection = await kidsCall('/api/kids/mascot');
      setCol(c); setDraft(c.look); setSaved(c.look); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar.'); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const pick = (key: LookKey, code: string | null) => {
    setNotice('');
    setDraft((d) => {
      const next = { ...d };
      if (code) next[key] = code; else delete next[key];
      return next;
    });
  };
  const save = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await kidsCall('/api/kids/mascot', 'PUT', { look: draft });
      setSaved(r.look); setDraft(r.look); setNotice(`${MASCOT_NAME} atualizado!`); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); } finally { setBusy(false); }
  };

  const dirty = !sameLook(draft, saved);
  return (
    <div className="space-y-4" data-testid="wardrobe-screen">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Meu {MASCOT_NAME}</h1>
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
      </div>
      {error && <div role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</div>}
      {notice && <div role="status" className="rounded-game border-2 border-game-success bg-game-surface p-3 font-semibold">{notice}</div>}

      <Card as="div" className="flex flex-col items-center gap-3 text-center" data-testid="wardrobe-preview">
        <LiveMascot size={9} look={draft} label={`${MASCOT_NAME} com o visual escolhido`} />
        <p className="text-game-ink-dim">{dirty ? 'Prévia: ainda não salvou.' : 'Este é o visual salvo.'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={save} disabled={!dirty || busy}>Salvar</Button>
          <Button variant="ghost" onClick={() => { setDraft(saved); setNotice(''); }} disabled={!dirty || busy}>Desfazer</Button>
        </div>
      </Card>

      {!col && !error && <p role="status" className="text-lg text-game-ink-dim">Carregando…</p>}
      {col && (
        <>
          <p className="text-center text-game-ink-dim" data-testid="wardrobe-count">Coleção: {col.ownedCount} de {col.total} itens</p>
          {LOOK_KEYS.map((key) => {
            const slot = SLOT_OF_KEY[key];
            const items = col.items.filter((i) => i.slot === slot);
            return (
              <Card key={key} title={TITLE[key]} as="section">
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label={TITLE[key]}>
                  <button type="button" aria-pressed={!draft[key]} onClick={() => pick(key, null)}
                    className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-game border-2 p-2 text-sm font-semibold ${!draft[key] ? 'border-game-primary bg-game-surface-2' : 'border-game-line bg-game-surface'}`}>
                    <span aria-hidden="true" className="text-2xl">∅</span>Nenhum
                  </button>
                  {items.map((it, i) => it.owned ? (
                    <button key={it.code} type="button" aria-pressed={draft[key] === it.code} onClick={() => pick(key, it.code)}
                      data-testid={`item-${it.code}`}
                      className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-game border-2 p-2 text-sm font-semibold ${draft[key] === it.code ? 'border-game-primary bg-game-surface-2' : 'border-game-line bg-game-surface'}`}>
                      <ItemIcon code={it.code} size={2.6} />
                      <span className="leading-tight">{it.name}</span>
                      <span className="text-xs font-normal text-game-ink-dim">{it.rarityLabel}</span>
                    </button>
                  ) : (
                    <div key={`lock-${slot}-${i}`} data-testid="item-locked"
                      className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-game border-2 border-dashed border-game-line bg-game-xp-track p-2 text-sm text-game-ink-dim">
                      <span aria-hidden="true" className="text-3xl font-bold opacity-60">?</span>
                      <span>Falta ganhar</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
