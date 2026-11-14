"use client";
import { useCallback, useEffect, useState } from "react";
import { groupExercisesByLesson } from "@/lib/class-exercise-rules";

type Option = { id: string; text: string };
type Exercise = {
  id: string; classId: string; className: string; lessonId: string | null; lessonTitle: string | null; title: string; question: string; options: Option[];
  correctOption: string | null; explanation: string | null;
  correctXp: number; correctCoins: number; attemptXp: number; attemptCoins: number;
  selectedOption: string | null; isCorrect: boolean | null; xpAwarded: number | null; coinsAwarded: number | null;
};
const card = "rounded-xl border border-white/10 bg-white/5 p-4 space-y-3";
const button = "rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50";

export function StudentExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const fetchExercises = useCallback(async (): Promise<Exercise[]> => {
    const response = await fetch("/api/student/exercises", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Erro ao carregar exercícios.");
    return result.exercises;
  }, []);
  const load = useCallback(async () => {
    try { setExercises(await fetchExercises()); }
    catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar exercícios."); }
  }, [fetchExercises]);
  useEffect(() => {
    let active = true;
    fetchExercises()
      .then(result => { if (active) setExercises(result); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Erro ao carregar exercícios."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchExercises]);

  const groups = groupExercisesByLesson(exercises);

  const answer = async (exercise: Exercise) => {
    const selectedOption = selection[exercise.id];
    if (!selectedOption) { setError("Selecione uma alternativa antes de confirmar."); return; }
    const confirmed = window.confirm("Confirmar esta resposta? Depois de enviada, ela não poderá ser alterada.");
    if (!confirmed) return;
    setBusy(exercise.id); setError("");
    try {
      const response = await fetch("/api/student/exercises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: exercise.id, selectedOption }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao registrar resposta.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao registrar resposta."); await load(); }
    finally { setBusy(""); }
  };

  if (loading) return <p role="status">Carregando exercícios…</p>;
  return <section className="space-y-4"><h2 className="text-xl font-bold">Atividades por aula</h2>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{exercises.length === 0 && <p>Nenhum exercício disponível nas suas turmas.</p>}{groups.map(group => <section key={group.key} className="space-y-3"><h3 className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 font-semibold text-amber-300">{group.label} · {group.items.length} questão(ões)</h3>{group.items.map((exercise, index) => <article key={exercise.id} className={card}><h4 className="text-base font-semibold">{exercise.title || `Questão ${index + 1}`}</h4><p>{exercise.question}</p>{exercise.selectedOption ? <div className="rounded-lg bg-slate-950/60 p-3"><p className={exercise.isCorrect ? "text-emerald-300" : "text-amber-300"}>{exercise.isCorrect ? "Resposta correta!" : "Resposta registrada. Obrigado por tentar!"}</p><p className="mt-1 text-sm">Sua resposta: {exercise.options.find(option => option.id === exercise.selectedOption)?.text || "registrada"}</p><p className="mt-1 text-sm">Alternativa correta: {exercise.options.find(option => option.id === exercise.correctOption)?.text || "—"}</p>{exercise.explanation && <p className="mt-2 text-sm">{exercise.explanation}</p>}<p className="mt-2 text-sm">Você recebeu {exercise.xpAwarded} XP e {exercise.coinsAwarded} Coins. Sua resposta não pode ser alterada.</p></div> : <><fieldset className="space-y-2"><legend className="sr-only">Escolha uma alternativa</legend>{exercise.options.map((option, optionIndex) => <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 p-3 hover:bg-white/5"><input type="radio" name={`exercise-${exercise.id}`} checked={selection[exercise.id] === option.id} onChange={() => setSelection(current => ({ ...current, [exercise.id]: option.id }))} /><span>{String.fromCharCode(65 + optionIndex)}. {option.text}</span></label>)}</fieldset><p className="text-xs text-white/60">Acerto: {exercise.correctXp} XP / {exercise.correctCoins} Coins · Tentativa: {exercise.attemptXp} XP / {exercise.attemptCoins} Coins</p><button className={button} disabled={busy === exercise.id || !selection[exercise.id]} onClick={() => void answer(exercise)}>{busy === exercise.id ? "Registrando…" : "Confirmar resposta"}</button></>}</article>)}</section>)}</section>;
}
