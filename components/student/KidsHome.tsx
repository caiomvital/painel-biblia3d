'use client';

import React, { useCallback, useEffect, useState } from 'react';

type Rank = { position: number; total: number };
type QuizSummary = { available: boolean; completedToday: boolean; scoreToday: number | null };
type Home = {
  firstName: string; points: number; level: number; profileCompleted: boolean;
  guardianName: string | null; birthDate: string | null; className: string | null;
  prize: { title: string; description: string | null; pointsGoal: number } | null;
  rankTurma: Rank | null; rankAcademia: Rank;
  quiz: QuizSummary; weekly: QuizSummary;
  lesson: { reportId: string; day: string; topics: string[]; done: boolean; checked: number[]; pointsAwarded: number } | null;
  rating: { teacherName: string; done: boolean; score: number | null } | null;
  googleReviewUrl: string | null;
};
type Review = { id: string; text: string; options: string[]; correctIndex: number; chosen: number | null };
type QuizState =
  | { available: false }
  | { available: true; completed: false; total: number; questions: { id: string; text: string; options: string[] }[] }
  | { available: true; completed: true; score: number; total: number; pointsAwarded: number; review: Review[] };

const card = 'rounded-3xl border border-slate-800 bg-slate-900/70 p-5';
const input = 'mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white';
const btn = 'rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40';

async function call(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Algo deu errado. Tente de novo.');
  return json;
}

function QuizCard({ kind, title, intro, doneText, emptyText, summary, onDone, onError }: {
  kind: 'daily' | 'weekly'; title: string; intro: string; doneText: string; emptyText: string;
  summary: QuizSummary; onDone: () => void; onError: (m: string) => void;
}) {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  const open = async () => {
    onError('');
    try {
      const q: QuizState = await call(`/api/kids/quiz?kind=${kind}`);
      setQuiz(q);
      if (q.available && !q.completed) setAnswers(new Array(q.total).fill(-1));
    } catch (e: any) { onError(e.message); }
  };
  const send = async () => {
    setSending(true); onError('');
    try {
      const r = await call('/api/kids/quiz', 'POST', { kind, answers });
      setQuiz({ available: true, ...r });
      onDone();
    } catch (e: any) { onError(e.message); } finally { setSending(false); }
  };

  return (
    <div className={card}>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {!summary.available && <p className="mt-2 text-sm text-slate-400">{emptyText}</p>}
      {summary.available && !quiz && (
        <>
          <p className="mt-2 text-sm text-slate-300">
            {summary.completedToday ? doneText.replace('{n}', String(summary.scoreToday ?? 0)) : intro}
          </p>
          <button onClick={open} className={`${btn} mt-4`}>{summary.completedToday ? 'Ver minhas respostas' : 'Começar'}</button>
        </>
      )}
      {quiz && quiz.available && !quiz.completed && (
        <div className="mt-3 space-y-5">
          {quiz.questions.map((q, qi) => (
            <fieldset key={q.id} className="space-y-2">
              <legend className="text-sm font-bold text-white">{qi + 1}. {q.text}</legend>
              {q.options.map((opt, oi) => (
                <label key={oi} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${answers[qi] === oi ? 'border-amber-400 bg-amber-500/15 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800/60'}`}>
                  <input type="radio" name={`${kind}-q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))} className="accent-amber-500" />
                  {opt}
                </label>
              ))}
            </fieldset>
          ))}
          <button onClick={send} disabled={sending || answers.some((a) => a < 0)} className={btn}>Enviar respostas</button>
        </div>
      )}
      {quiz && quiz.available && quiz.completed && (
        <div className="mt-3 space-y-4">
          <p className="text-base font-bold text-amber-300">Você acertou {quiz.score} de {quiz.total}! {quiz.pointsAwarded > 0 ? `+${quiz.pointsAwarded} pontos 🎉` : ''}</p>
          {quiz.review.map((r, i) => (
            <div key={r.id} className="space-y-1 text-sm">
              <p className="font-bold text-white">{i + 1}. {r.text}</p>
              {r.options.map((o, oi) => (
                <p key={oi} className={oi === r.correctIndex ? 'text-emerald-300' : oi === r.chosen ? 'text-rose-300' : 'text-slate-400'}>
                  {oi === r.correctIndex ? '✔ ' : oi === r.chosen ? '✘ ' : '• '}{o}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, onDone, onError }: { lesson: NonNullable<Home['lesson']>; onDone: (msg: string) => void; onError: (m: string) => void }) {
  const [checked, setChecked] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const day = lesson.day.split('-').reverse().join('/');
  const send = async () => {
    setSending(true); onError('');
    try {
      const r = await call('/api/kids/lesson', 'POST', { reportId: lesson.reportId, checked });
      onDone(r.pointsAwarded ? `Que legal! +${r.pointsAwarded} pontos por tudo que você aprendeu! 🎉` : 'Obrigado por contar!');
    } catch (e: any) { onError(e.message); } finally { setSending(false); }
  };
  return (
    <div className={card}>
      <h3 className="text-lg font-bold text-white">📚 O que vimos na aula ({day})</h3>
      {lesson.done ? (
        <>
          <p className="mt-2 text-sm text-slate-300">Você já contou o que aprendeu{lesson.pointsAwarded ? ` e ganhou ${lesson.pointsAwarded} pontos` : ''}. Muito bem!</p>
          <ul className="mt-2 space-y-1 text-sm">
            {lesson.topics.map((t, i) => <li key={i} className={lesson.checked.includes(i) ? 'text-emerald-300' : 'text-slate-400'}>{lesson.checked.includes(i) ? '✔ ' : '• '}{t}</li>)}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-300">Marque o que você aprendeu. Cada item vale 2 pontos, e o que você não marcar não tira pontos de ninguém.</p>
          <div className="mt-3 space-y-2">
            {lesson.topics.map((t, i) => (
              <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${checked.includes(i) ? 'border-amber-400 bg-amber-500/15 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800/60'}`}>
                <input type="checkbox" checked={checked.includes(i)} onChange={() => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))} className="accent-amber-500" />
                {t}
              </label>
            ))}
          </div>
          <button onClick={send} disabled={sending} className={`${btn} mt-4`}>Enviar</button>
        </>
      )}
    </div>
  );
}

function RatingCard({ rating, googleUrl, onDone, onError }: {
  rating: NonNullable<Home['rating']>; googleUrl: string | null; onDone: (msg: string) => void; onError: (m: string) => void;
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
      const r = await call('/api/kids/rating', 'POST', { enjoying, score, comment });
      setSent(true);
      onDone(`Obrigado por contar! +${r.pointsAwarded} pontos 🎉`);
    } catch (e: any) { onError(e.message); } finally { setSending(false); }
  };

  return (
    <div className={card}>
      <h3 className="text-lg font-bold text-white">⭐ Como foi com o professor {teacher}?</h3>
      {sent ? (
        <div className="mt-2 space-y-3 text-sm text-slate-300">
          <p>Obrigado! Sua opinião ajuda o professor a melhorar. Você pode avaliar de novo na próxima semana.</p>
          {googleUrl && (
            <p className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs">
              Se o seu responsável quiser, também pode contar o que achou da escola no Google — é opcional, e vale a nota que vocês acharem justa.{' '}
              <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-amber-300 underline">Abrir avaliação no Google</a>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">Você está gostando das aulas?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {([['YES', '😀 Sim!'], ['SO_SO', '😐 Mais ou menos'], ['NO', '🙁 Não muito']] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setEnjoying(v)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${enjoying === v ? 'border-amber-400 bg-amber-500/20 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800/60'}`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Que nota você dá para o professor {teacher}?</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n} type="button" onClick={() => setScore(n)} aria-label={`Nota ${n}`}
                  className={`h-10 w-10 rounded-xl border text-sm font-black ${score === n ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 text-slate-300 hover:bg-slate-800/60'}`}>{n}</button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-semibold text-slate-300">Quer escrever alguma coisa? (opcional)
            <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={200} className={input} />
          </label>
          <button onClick={send} disabled={sending || !enjoying || !score} className={btn}>Enviar minha opinião (+5 pontos)</button>
        </div>
      )}
    </div>
  );
}

export function KidsHome({ onPointsChanged }: { onPointsChanged?: () => void }) {
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [birth, setBirth] = useState('');
  const [guardian, setGuardian] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const h: Home = await call('/api/kids/home');
      setHome(h);
      setBirth(h.birthDate ?? '');
      setGuardian(h.guardianName ?? '');
      setError('');
    } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);
  const refresh = () => { load(); onPointsChanged?.(); };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const r = await call('/api/kids/profile', 'POST', { birthDate: birth, guardianName: guardian });
      setNotice(r.awarded ? `Cadastro completo! Você ganhou ${r.awarded} pontos! 🎉` : 'Cadastro salvo!');
      refresh();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  if (!home) return <div className={card}>{error || 'Carregando seu painel...'}</div>;
  const goal = home.prize?.pointsGoal ?? 0;
  const pct = goal ? Math.min(100, Math.round((home.points / goal) * 100)) : 0;
  const ord = (n: number) => `${n}º`;

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}

      {home.prize && (
        <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-amber-700/10 to-slate-900 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">🏆 Prêmio do mês</p>
          <h2 className="mt-1 text-xl font-black text-white">{home.prize.title}</h2>
          {home.prize.description && <p className="mt-1 text-sm text-slate-300">{home.prize.description}</p>}
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-semibold text-amber-200">{home.points} de {goal} pontos{home.points >= goal ? ' — você conseguiu! 🎉' : ''}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={card}>
          <p className="text-xs font-semibold text-slate-400">Olá, {home.firstName}! Seus pontos</p>
          <p className="mt-1 text-4xl font-black text-amber-300">⭐ {home.points}</p>
          <p className="text-xs text-slate-400">Nível {home.level}</p>
        </div>
        <div className={card}>
          <p className="text-xs font-semibold text-slate-400">Na sua turma{home.className ? ` (${home.className})` : ''}</p>
          <p className="mt-1 text-4xl font-black text-white">{home.rankTurma ? ord(home.rankTurma.position) : '—'}</p>
          <p className="text-xs text-slate-400">{home.rankTurma ? `de ${home.rankTurma.total} alunos` : 'Sem turma ainda'}</p>
        </div>
        <div className={card}>
          <p className="text-xs font-semibold text-slate-400">Em toda a Academia</p>
          <p className="mt-1 text-4xl font-black text-white">{ord(home.rankAcademia.position)}</p>
          <p className="text-xs text-slate-400">de {home.rankAcademia.total} alunos</p>
        </div>
      </div>

      {!home.profileCompleted && (
        <form onSubmit={saveProfile} className={card}>
          <h3 className="text-lg font-bold text-white">Complete seu cadastro e ganhe 20 pontos! 🎁</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-300">Data de nascimento
              <input type="date" required value={birth} onChange={(e) => setBirth(e.target.value)} className={input} />
            </label>
            <label className="text-xs font-semibold text-slate-300">Nome do responsável
              <input type="text" required minLength={2} maxLength={120} value={guardian} onChange={(e) => setGuardian(e.target.value)} className={input} />
            </label>
          </div>
          <button type="submit" disabled={saving} className={`${btn} mt-4`}>Salvar meu cadastro</button>
        </form>
      )}

      {home.lesson && (
        <LessonCard key={home.lesson.reportId + String(home.lesson.done)} lesson={home.lesson}
          onDone={(m) => { setNotice(m); refresh(); }} onError={setError} />
      )}

      <QuizCard kind="daily" title="🧠 Desafio do dia" summary={home.quiz}
        intro="5 perguntinhas de múltipla escolha. Cada acerto vale 5 pontos, e acertar todas dá +10 de bônus!"
        doneText="Você já fez o desafio de hoje e acertou {n}! Volte amanhã para mais pontos."
        emptyText="Ainda não há perguntas liberadas. Volte em breve!"
        onDone={refresh} onError={setError} />

      {home.rating && (
        <RatingCard key={String(home.rating.done)} rating={home.rating} googleUrl={home.googleReviewUrl}
          onDone={(m) => { setNotice(m); refresh(); }} onError={setError} />
      )}

      {(home.weekly.available || home.weekly.completedToday) && (
        <QuizCard kind="weekly" title="🏅 Desafio da semana" summary={home.weekly}
          intro="Perguntas feitas pelo seu professor sobre o que vimos nas aulas. Valem os mesmos pontos!"
          doneText="Você já fez o desafio desta semana e acertou {n}! Volte na próxima."
          emptyText="" onDone={refresh} onError={setError} />
      )}
    </div>
  );
}
