'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CoinRise, useGameSound } from '@/components/ui/game';
import { quizBreakdown, POINTS_COMPLETE, POINTS_CORRECT, POINTS_WRONG } from '@/lib/quiz-points';
import { quizRewardSummary, type RewardSummaryData } from '@/lib/reward-summary';
import { kidsCall } from '../kids-api';
import { OptionTile } from './OptionTile';
import { DaviTutor } from '../guide/DaviGuide';
import { DAVI_QUIZ_INTRO } from '@/lib/davi-guide';

type Review = { id: string; text: string; options: string[]; correctIndex: number; chosen: number | null };
type Question = { id: string; text: string; options: string[] };
type QuizState =
  | { available: false }
  | { available: true; completed: false; total: number; questions: Question[] }
  | { available: true; completed: true; score: number; total: number; pointsAwarded: number; review: Review[] };
type Result = { score: number; total: number; pointsAwarded: number; coinsAwarded: number; review: Review[] };

/**
 * Desafio em formato de jogo: abre direto na primeira pergunta, uma de cada vez. Ao concluir, as moedas "sobem"
 * pergunta por pergunta (1 por responder, 5 por acerto) e depois o bônus por concluir, e então vem a Tela de Resultado.
 */
export function QuizPlayer({ kind, emptyText, onDone, onError, onReward }: {
  kind: 'daily' | 'weekly'; emptyText: string; onDone: () => void; onError: (m: string) => void;
  onReward?: (s: RewardSummaryData) => void;
}) {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<'play' | 'reveal' | 'review'>('play');
  const { play } = useGameSound();
  const pendingRefresh = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  // se a criança sair no meio da animação, os pontos já creditados ainda aparecem no topo
  useEffect(() => () => { if (pendingRefresh.current) onDoneRef.current(); }, []);

  useEffect(() => {
    let alive = true;
    onError('');
    kidsCall(`/api/kids/quiz?kind=${kind}`).then((q: QuizState) => {
      if (!alive) return;
      setQuiz(q);
      if (q.available && !q.completed) setAnswers(new Array(q.total).fill(-1));
      if (q.available && q.completed) setPhase('review');
    }).catch((e) => { if (alive) onError(e instanceof Error ? e.message : 'Erro.'); });
    return () => { alive = false; };
  }, [kind, onError]);

  const send = async () => {
    setSending(true); onError('');
    try {
      const r: Result & { completed: true } = await kidsCall('/api/kids/quiz', 'POST', { kind, answers });
      pendingRefresh.current = true;
      setResult(r); setShown(0); setPhase('reveal');
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro.'); } finally { setSending(false); }
  };

  const finishReveal = useCallback(() => {
    setPhase('review');
    if (result) { const reward = quizRewardSummary(result); if (reward) onReward?.(reward); } // antes do recarregamento
    pendingRefresh.current = false;
    onDoneRef.current();
  }, [result, onReward]);

  // revela uma linha por vez (pergunta 1, 2, ... e por fim o bônus por concluir)
  useEffect(() => {
    if (phase !== 'reveal' || !result) return;
    const rows = result.total + 1;
    const t = setTimeout(() => {
      if (shown < rows) { setShown((n) => n + 1); play('coin'); } else finishReveal();
    }, shown === 0 ? 500 : shown < rows ? 850 : 1100);
    return () => clearTimeout(t);
  }, [phase, result, shown, play, finishReveal]);

  if (!quiz) return <Card data-testid={`quiz-${kind}`}><p role="status" className="text-game-ink-dim">Carregando…</p></Card>;
  if (!quiz.available) return <Card data-testid={`quiz-${kind}`}><p className="text-game-ink-dim">{emptyText}</p></Card>;

  if (phase === 'reveal' && result) {
    const flags = result.review.map((r) => r.chosen === r.correctIndex);
    const b = quizBreakdown(flags);
    return (
      <Card title="Contando seus pontos" data-testid={`quiz-${kind}`}>
        <ul className="space-y-2" aria-live="polite">
          {b.perQuestion.slice(0, Math.min(shown, result.total)).map((pts, i) => (
            <li key={i} className="relative flex items-center justify-between rounded-game border-2 border-game-line bg-game-surface-2 px-4 py-3">
              <span>Pergunta {i + 1} {flags[i] ? '✔' : '✘'}</span>
              <span className={`font-[family-name:var(--font-game-title)] text-2xl ${flags[i] ? 'text-game-success' : 'text-game-ink-dim'}`}>+{pts}</span>
              <CoinRise count={flags[i] ? 6 : 2} />
            </li>
          ))}
          {shown > result.total && b.completion > 0 && (
            <li className="relative flex items-center justify-between rounded-game border-2 border-game-primary bg-game-surface-2 px-4 py-3">
              <span className="font-semibold">Você concluiu!</span>
              <span className="font-[family-name:var(--font-game-title)] text-2xl text-game-primary">+{b.completion}</span>
              <CoinRise count={9} />
            </li>
          )}
        </ul>
      </Card>
    );
  }

  if (phase === 'review') {
    const done = result ? { score: result.score, total: result.total, pointsAwarded: result.pointsAwarded, review: result.review }
      : quiz.available && quiz.completed ? quiz : null;
    if (!done) return null;
    return (
      <Card title={kind === 'daily' ? 'Desafio do dia' : 'Desafio da semana'} tone="success" data-testid={`quiz-${kind}`}>
        <p className="text-xl font-semibold text-game-primary">
          {done.score === 0 ? 'Você deu o seu melhor!' : done.score === 1 ? 'Você acertou 1 pergunta!' : `Você acertou ${done.score} perguntas!`} {done.pointsAwarded > 0 ? `+${done.pointsAwarded} pontos` : ''}
        </p>
        <p className="mt-1 text-game-ink-dim">{kind === 'daily' ? 'Volte amanhã para um novo desafio!' : 'Volte na próxima semana!'}</p>
        <div className="mt-4 space-y-4">
          {done.review.map((r, i) => (
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
      </Card>
    );
  }

  if (quiz.available && !quiz.completed) {
    const q = quiz.questions[step];
    const last = step === quiz.total - 1;
    return (
      <Card title={kind === 'daily' ? 'Desafio do dia' : 'Desafio da semana'} data-testid={`quiz-${kind}`}>
        {step === 0 && <DaviTutor text={DAVI_QUIZ_INTRO} mood="feliz" className="mb-3" />}
        {step === 0 && (
          <p className="mb-3 text-sm text-game-ink-dim">
            Ganhe moedas: {POINTS_WRONG} ponto por responder, {POINTS_CORRECT} por acertar e {POINTS_COMPLETE} por concluir!
          </p>
        )}
        <fieldset key={q.id} className="space-y-2">
          <legend className="mb-2 text-lg font-semibold">{q.text}</legend>
          {q.options.map((opt, oi) => (
            <OptionTile key={oi} type="radio" name={`${kind}-q${step}`} checked={answers[step] === oi}
              onChange={() => setAnswers((a) => a.map((v, i) => (i === step ? oi : v)))}>{opt}</OptionTile>
          ))}
        </fieldset>
        <div className="mt-4 flex gap-2">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Voltar</Button>}
          <Button size="lg" className="flex-1" disabled={sending || answers[step] < 0}
            onClick={() => (last ? void send() : setStep(step + 1))}>{sending ? 'Enviando…' : 'Próxima'}</Button>
        </div>
      </Card>
    );
  }
  return null;
}
