'use client';

import React from 'react';
import { Button, Card } from '@/components/ui/game';
import { GAMES_TEXT as T } from './copy';

const field = 'mt-1 w-full rounded-game border-2 border-game-line bg-game-bg px-4 py-3 text-base font-normal text-game-ink';

export function SubmitGameForm({ sending, onSubmit, onCancel }: {
  sending: boolean; onSubmit: (data: { title: string; description: string; html: string; isPublic: boolean }) => void; onCancel: () => void;
}) {
  return (
    <Card title={T.send} tone="highlight" data-testid="game-submit-form">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSubmit({ title: String(f.get('title') ?? ''), description: String(f.get('description') ?? ''), html: String(f.get('html') ?? ''), isPublic: f.get('isPublic') === 'on' });
        }}
      >
        <p className="text-game-ink-dim">{T.sendHelp}</p>
        <label className="block font-semibold">Nome do jogo
          <input name="title" required minLength={3} maxLength={60} className={`${field} min-h-12`} /></label>
        <label className="block font-semibold">Como se joga? (opcional)
          <input name="description" maxLength={200} className={`${field} min-h-12`} /></label>
        <label className="block font-semibold">Código do jogo (HTML)
          <textarea name="html" required rows={8} className={`${field} font-mono text-sm`} placeholder="<!doctype html>..." /></label>
        <label className="flex items-start gap-3 rounded-game border-2 border-game-line bg-game-surface-2 p-3 font-semibold">
          <input type="checkbox" name="isPublic" data-testid="game-public" className="mt-1 size-5 shrink-0 accent-[var(--color-game-primary)]" />
          <span>{T.makePublic}<span className="block text-sm font-normal text-game-ink-dim">{T.makePublicHelp}</span></span>
        </label>
        <div className="flex gap-3">
          <Button type="submit" disabled={sending}>Enviar</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}
