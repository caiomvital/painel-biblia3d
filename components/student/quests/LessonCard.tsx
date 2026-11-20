'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui/game';
import { kidsCall, type KidsHomeData } from '../kids-api';
import { POINTS_PER_LESSON_TOPIC } from '@/lib/lesson-points';
import { OptionTile } from './OptionTile';

export function LessonCard({ lesson, onDone, onError }: {
  lesson: NonNullable<KidsHomeData['lesson']>; onDone: (msg: string) => void; onError: (m: string) => void;
}) {
  const [checked, setChecked] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const day = lesson.day.split('-').reverse().join('/');
  const send = async () => {
    setSending(true); onError('');
    try {
      const r = await kidsCall('/api/kids/lesson', 'POST', { reportId: lesson.reportId, checked });
      onDone(r.pointsAwarded ? `Muito bem! +${r.pointsAwarded} pontos!` : 'Obrigado por contar!');
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro.'); } finally { setSending(false); }
  };
  return (
    <Card title={`Aula de ${day}`} data-testid="quest-lesson">
      {lesson.done ? (
        <>
          <p className="text-game-ink-dim">Pronto! Você já contou{lesson.pointsAwarded ? ` e ganhou ${lesson.pointsAwarded} pontos` : ''}.</p>
          <ul className="mt-2 space-y-1">
            {lesson.topics.map((t, i) => (
              <li key={i} className={lesson.checked.includes(i) ? 'text-game-success' : 'text-game-ink-dim'}>
                {lesson.checked.includes(i) ? '✔ ' : '• '}{t}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="text-game-ink-dim">Marque só o que você lembra. Cada item vale {POINTS_PER_LESSON_TOPIC} pontos.</p>
          <div className="mt-3 space-y-2">
            {lesson.topics.map((t, i) => (
              <OptionTile key={i} type="checkbox" checked={checked.includes(i)}
                onChange={() => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}>{t}</OptionTile>
            ))}
          </div>
          <Button onClick={send} disabled={sending} className="mt-4">Salvar</Button>
        </>
      )}
    </Card>
  );
}
