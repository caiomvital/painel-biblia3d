'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui/game';
import { kidsCall, type KidsHomeData } from '../kids-api';

const ENJOY = [['YES', 'Sim!'], ['SO_SO', 'Mais ou menos'], ['NO', 'Não muito']] as const;

export function RatingCard({ rating, googleUrl, onDone, onError }: {
  rating: NonNullable<KidsHomeData['rating']>; googleUrl: string | null; onDone: (msg: string) => void; onError: (m: string) => void;
}) {
  const [enjoying, setEnjoying] = useState<'YES' | 'SO_SO' | 'NO' | ''>('');
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(rating.done);
  const teacher = rating.teacherName.split(' ')[0];

  const send = async () => {
    setSending(true); onError('');
    try {
      const r = await kidsCall('/api/kids/rating', 'POST', { enjoying, score, comment });
      setSent(true);
      onDone(`Obrigado! +${r.pointsAwarded} pontos!`);
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro.'); } finally { setSending(false); }
  };

  const chip = (on: boolean) =>
    `min-h-12 rounded-game border-2 px-4 text-base font-semibold ${on ? 'border-game-primary bg-game-primary text-game-ink-on-light' : 'border-game-line bg-game-surface-2 text-game-ink'}`;

  return (
    <Card title={`Professor ${teacher}`} data-testid="quest-rating">
      {sent ? (
        <div className="space-y-3 text-game-ink-dim">
          <p>Obrigado! Você pode avaliar de novo na próxima semana.</p>
          {googleUrl && (
            <p className="rounded-game border-2 border-game-line bg-game-surface-2 p-3 text-sm">
              Se o seu responsável quiser, ele pode contar o que achou da escola no Google. É opcional, com a nota que achar justa.{' '}
              <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-game-primary underline">Abrir avaliação no Google</a>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 font-semibold">Está gostando das aulas?</p>
            <div className="flex flex-wrap gap-2">
              {ENJOY.map(([v, label]) => (
                <button key={v} type="button" aria-pressed={enjoying === v} onClick={() => setEnjoying(v)} className={chip(enjoying === v)}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-semibold">Que nota você dá?</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n} type="button" aria-pressed={score === n} aria-label={`Nota ${n}`} onClick={() => setScore(n)}
                  className={`size-12 rounded-game border-2 text-lg font-bold ${score === n ? 'border-game-primary bg-game-primary text-game-ink-on-light' : 'border-game-line bg-game-surface-2 text-game-ink'}`}>{n}</button>
              ))}
            </div>
          </div>
          <label className="block font-semibold">Quer escrever algo? (opcional)
            <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={200}
              className="mt-1 min-h-12 w-full rounded-game border-2 border-game-line bg-game-bg px-4 text-base font-normal text-game-ink" />
          </label>
          <Button onClick={send} disabled={sending || !enjoying || !score}>Enviar (+5 pontos)</Button>
        </div>
      )}
    </Card>
  );
}
