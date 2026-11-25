'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CoinRise, useGameSound } from '@/components/ui/game';
import { quizBreakdown, POINTS_COMPLETE, POINTS_CORRECT, POINTS_WRONG, QUIZ_BLOCK } from '@/lib/quiz-points';
import { quizRewardSummary, type RewardSummaryData } from '@/lib/reward-summary';
import { kidsCall } from '../kids-api';
import { OptionTile } from './OptionTile';
import { DaviTutor } from '../guide/DaviGuide';
import { DAVI_QUIZ_INTRO } from '@/lib/davi-guide';

type Review = { id: string; text: string; options: string[]; correctIndex: number; chosen: number | null };
type Question = { id: string; text: string; options: string[] };
type QuizState =
  | { available: false }
  | { available: true; completed: false; total: number; blockSize?: number; questions: Question[]; checked?: { index: number; chosen: number; correctIndex: number }[] }
  | { available: true; completed: true; score: number; total: number; pointsAwarded: number; review: Review[] };
type Result = { score: number; total: number; pointsAwarded: number; coinsAwarded: number; review: Review[] };

/**
 * Desafio em formato de jogo: abre direto na primeira pergunta, uma de cada vez. As perguntas vêm em desafios de 5, e o aluno
 * responde quantas quiser: depois de cada resposta pode seguir ("Próxima pergunta") ou "Encerrar". Ao encerrar, as moedas "sobem"
 * pergunta por pergunta (1 por responder, 5 por acerto) e depois o bônus de cada desafio de 5 completo, e então vem a Tela de Resultado.
 * O aluno nunca vê quantas perguntas existem no total.
 */
export function QuizPlayer({ kind, emptyText, onDone, onError, onReward, onExit }: {
  kind: 'daily' | 'weekly'; emptyText: string; onDone: () => void; onError: (m: string) => void;
  onReward?: (s: RewardSummaryData) => void;
  /** Terminou de contar os pontos: sai do Desafio (a Tela de Resultado aparece por cima do início). */
  onExit?: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  // resposta já conferida na hora, por pergunta: a criança vê certo ou errado antes de seguir
  const [feedback, setFeedback] = useState<Record<number, { chosen: number; correctIndex: number }>>({});
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<'play' | 'reveal' | 'review'>('play');
  const { play } = useGameSound();
  const pendingRefresh = useRef(false);
  const onDoneRef = useRef(onDone);
  const onExitRef = useRef(onExit);
  useEffect(() => { onDoneRef.current = onDone; onExitRef.current = onExit; }, [onDone, onExit]);
  // se a criança sair no meio da animação, os pontos já creditados ainda aparecem no topo
  useEffect(() => () => { if (pendingRefresh.current) onDoneRef.current(); }, []);

  useEffect(() => {
    let alive = true;
    onError('');
    kidsCall(`/api/kids/quiz?kind=${kind}`).then((q: QuizState) => {
      if (!alive) return;
      setQuiz(q);
      if (q.available && !q.completed) {
        const fb: Record<number, { chosen: number; correctIndex: number }> = {};
        const ans: number[] = new Array(q.total).fill(-1);
        for (const c of q.checked ?? []) { fb[c.index] = { chosen: c.chosen, correctIndex: c.correctIndex }; ans[c.index] = c.chosen; }
        setAnswers(ans); setFeedback(fb);
        setStep(Math.min(q.total - 1, (q.checked ?? []).length)); // retoma na primeira pergunta ainda sem resposta
      }
      if (q.available && q.completed) setPhase('review');
    }).catch((e) => { if (alive) onError(e instanceof Error ? e.message : 'Erro.'); });
    return () => { alive = false; };
  }, [kind, onError]);

  const check = async () => {
    setChecking(true); onError('');
    try {
      const r: { chosen: number; correct: boolean; correctIndex: number } = await kidsCall('/api/kids/quiz', 'POST', { kind, check: true, index: step, choice: answers[step] });
      setFeedback((f) => ({ ...f, [step]: { chosen: r.chosen, correctIndex: r.correctIndex } }));
      setAnswers((a) => a.map((v, i) => (i === step ? r.chosen : v)));
      play(r.correct ? 'success' : 'tap');
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro.'); } finally { setChecking(false); }
  };

  const send = async () => {
    setSending(true); onError('');
    try {
      const r: Result & { completed: true } = await kidsCall('/api/kids/quiz', 'POST', { kind, finish: true });
      pendingRefresh.current = true;
      setResult(r); setShown(0); setPhase('reveal');
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro.'); } finally { setSending(false); }
  };

  const finishReveal = useCallback(() => {
    if (result) { const reward = quizRewardSummary(result); if (reward) onReward?.(reward); } // antes do recarregamento
    pendingRefresh.current = false;
    onDoneRef.current();
    onExitRef.current?.(); // sem tela de descrição: vai direto para o início
  }, [result, onReward]);

  // revela uma linha por vez (pergunta 1, 2, ... e por fim o bônus por concluir)
  useEffect(() => {
    if (phase !== 'reveal' || !result) return;
    const rows = result.total + 1; // uma linha por pergunta respondida + o bônus dos desafios completos
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
              <span className="font-semibold">{b.blocks === 1 ? 'Desafio completo!' : `${b.blocks} desafios completos!`}</span>
              <span className="font-[family-name:var(--font-game-title)] text-2xl text-game-primary">+{b.completion}</span>
              <CoinRise count={9} />
            </li>
          )}
        </ul>
      </Card>
    );
  }

  if (phase === 'review') {
    // Desafio já feito (voltou ao abrir): só um aviso curto. As respostas e a descrição das perguntas não aparecem mais.
    return (
      <Card title={kind === 'daily' ? 'Desafio do dia' : 'Desafio da semana'} tone="success" data-testid={`quiz-${kind}`}>
        <p className="text-xl font-semibold text-game-primary">Desafio feito! 🎉</p>
        <p className="mt-1 text-game-ink-dim">{kind === 'daily' ? 'Volte amanhã para um novo desafio!' : 'Volte na próxima semana!'}</p>
      </Card>
    );
  }

  if (quiz.available && !quiz.completed) {
    const q = quiz.questions[step];
    const last = step === quiz.total - 1;
    const fb = feedback[step];
    const right = !!fb && fb.chosen === fb.correctIndex;
    const block = Math.floor(step / QUIZ_BLOCK) + 1;
    const blockDone = !!fb && (step + 1) % QUIZ_BLOCK === 0;
    return (
      <Card title={kind === 'daily' ? 'Desafio do dia' : 'Desafio da semana'} data-testid={`quiz-${kind}`}>
        {step === 0 && !fb && <DaviTutor text={DAVI_QUIZ_INTRO} mood="feliz" className="mb-3" />}
        {step === 0 && !fb && (
          <p className="mb-3 text-sm text-game-ink-dim">
            Responda quantas quiser! {POINTS_WRONG} ponto por responder, {POINTS_CORRECT} por acertar e {POINTS_COMPLETE} a cada {QUIZ_BLOCK} perguntas completas.
          </p>
        )}
        <p className="mb-1 text-sm font-semibold text-game-ink-dim">Pergunta {step + 1} · Desafio {block}</p>
        <fieldset key={q.id} className="space-y-2" disabled={!!fb}>
          <legend className="mb-2 text-lg font-semibold">{q.text}</legend>
          {q.options.map((opt, oi) => {
            const state = !fb ? undefined : oi === fb.correctIndex ? 'right' : oi === fb.chosen ? 'wrong' : 'other';
            return (
              <OptionTile key={oi} type="radio" name={`${kind}-q${step}`} checked={answers[step] === oi} state={state}
                onChange={() => setAnswers((a) => a.map((v, i) => (i === step ? oi : v)))}>{opt}</OptionTile>
            );
          })}
        </fieldset>
        {fb && (
          <p role="status" data-testid="quiz-feedback" className={`mt-3 rounded-game border-2 px-4 py-3 text-lg font-semibold ${right ? 'border-game-success text-game-success' : 'border-game-danger text-game-ink'}`}>
            {right ? '✔ Acertou! Muito bem!' : `✘ Quase! A resposta certa é: ${q.options[fb.correctIndex]}`}
          </p>
        )}
        {blockDone && !last && (
          <p data-testid="quiz-block-done" className="mt-3 rounded-game border-2 border-game-primary bg-game-surface-2 px-4 py-3 text-lg font-semibold text-game-primary">
            🎉 Desafio {block} completo! Você ganhou {POINTS_COMPLETE} pontos de bônus. Quer continuar?
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {step > 0 && !fb && <Button variant="ghost" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {!fb ? (
            <>
              <Button size="lg" className="flex-1" disabled={checking || answers[step] < 0} onClick={() => void check()}>{checking ? 'Conferindo…' : 'Responder'}</Button>
              {answers.some((a) => a >= 0) && <Button size="lg" variant="ghost" disabled={sending || checking} onClick={() => void send()} data-testid="quiz-finish">{sending ? 'Enviando…' : 'Encerrar'}</Button>}
            </>
          ) : last ? (
            <Button size="lg" className="flex-1" disabled={sending} onClick={() => void send()}>{sending ? 'Enviando…' : 'Ver meus pontos'}</Button>
          ) : (
            <>
              <Button size="lg" className="flex-1" disabled={sending} onClick={() => setStep(step + 1)}>Próxima pergunta</Button>
              <Button size="lg" variant="ghost" disabled={sending} onClick={() => void send()} data-testid="quiz-finish">{sending ? 'Enviando…' : 'Encerrar'}</Button>
            </>
          )}
        </div>
      </Card>
    );
  }
  return null;
}
