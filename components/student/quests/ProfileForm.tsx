'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui/game';
import { kidsCall, type KidsHomeData } from '../kids-api';

export function ProfileForm({ home, onDone, onError }: { home: KidsHomeData; onDone: (msg: string) => void; onError: (m: string) => void }) {
  const [birth, setBirth] = useState(home.birthDate ?? '');
  const [guardian, setGuardian] = useState(home.guardianName ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); onError('');
    try {
      const r = await kidsCall('/api/kids/profile', 'POST', { birthDate: birth, guardianName: guardian });
      onDone(r.awarded ? `Cadastro completo! +${r.awarded} pontos!` : 'Cadastro salvo!');
    } catch (err) { onError(err instanceof Error ? err.message : 'Erro.'); } finally { setSaving(false); }
  };
  const field = 'mt-1 min-h-12 w-full rounded-game border-2 border-game-line bg-game-bg px-4 text-base font-normal text-game-ink';
  return (
    <Card title="Ganhe 20 pontos" tone="highlight">
      <form onSubmit={save} className="space-y-3">
        <p className="text-game-ink-dim">Complete o seu cadastro.</p>
        <label className="block font-semibold">Data de nascimento
          <input type="date" required value={birth} onChange={(e) => setBirth(e.target.value)} className={field} />
        </label>
        <label className="block font-semibold">Nome do responsável
          <input type="text" required minLength={2} maxLength={120} value={guardian} onChange={(e) => setGuardian(e.target.value)} className={field} />
        </label>
        <Button type="submit" disabled={saving}>Salvar</Button>
      </form>
    </Card>
  );
}
