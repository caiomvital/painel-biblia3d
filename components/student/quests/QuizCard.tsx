'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui/game';
import { kidsCall, type QuizSummary } from '../kids-api';
import { OptionTile } from './OptionTile';

type Review = { id: string; text: string; options: string[]; correctIndex: number; chosen: number | null };
type QuizState =
  | { available: false }
  | { available: true; completed: false; total: number; questions: { id: string; text: string; options: string[] }[] }
  | { available: true; completed: true; score: number; total: number; pointsAwarded: number; review: Review[] };

export function QuizCard({ kind, title, intro, doneText, emptyText, summary, onDone, onError }: {
  kind: 'daily' | 'weekly'; title: string; intro: string; doneText: string; emptyText: string;
  summary: QuizSummary; onDone: () => void; onError: (m: string) => void;
}) {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  const open = async () => {
    onError('');
    try {
      const q: QuizState = await kidsCall(`/api/kids/quiz?kind=${kind}`);
      setQuiz(q);
      if (q.available && !q.completed) setAnswers(new Array(q.total).fill(-1));
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro.'); }
  };
  const send = async () => {
    setSending(true); onError('');
    try {
      const r = await kidsCall('/api/kids/quiz', 'POST', { kind, answers });
      setQuiz({ available: true, ...r });
      onDone();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro.'); } finally { setSending(false); }
  };

  return (
    <Card title={title} data-testid={`quiz-${kind}`}>
      {!summary.available && <p className="text-game-ink-dim">{emptyText}</p>}
      {summary.available && !quiz && (
        <>
          <p className="text-game-ink-dim">
            {summary.completedToday ? doneText.replace('{n}', String(summary.scoreToday ?? 0)) : intro}
          </p>
          <Button onClick={open} className="mt-4">{summary.completedToday ? 'Ver respostas' : 'Começar'}</Button>
        </>
      )}
      {quiz && quiz.available && !quiz.completed && (
        <div className="mt-2 space-y-6">
          {quiz.questions.map((q, qi) => (
            <fieldset key={q.id} className="space-y-2">
              <legend className="mb-2 text-lg font-semibold">{qi + 1}. {q.text}</legend>
              {q.options.map((opt, oi) => (
                <OptionTile key={oi} type="radio" name={`${kind}-q${qi}`} checked={answers[qi] === oi}
                  onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}>{opt}</OptionTile>
              ))}
            </fieldset>
          ))}
          <Button size="lg" onClick={send} disabled={sending || answers.some((a) => a < 0)}>Enviar</Button>
        </div>
      )}
      {quiz && quiz.available && quiz.completed && (
        <div className="mt-2 space-y-4">
          <p className="text-xl font-semibold text-game-primary">
            Você acertou {quiz.score} de {quiz.total}! {quiz.pointsAwarded > 0 ? `+${quiz.pointsAwarded} pontos` : ''}
          </p>
          {quiz.review.map((r, i) => (
            <div key={r.id} className="space-y-1">
              <p className="font-semibold">{i + 1}. {r.text}</p>
              {r.options.map((o, oi) => (
                <p key={oi} className={oi === r.correctIndex ? 'text-game-success' : oi === r.chosen ? 'text-game-danger' : 'text-game-ink-dim'}>
                  {oi === r.correctIndex ? '✔ Certa: ' : oi === r.chosen ? '✘ Sua resposta: ' : '• '}{o}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
