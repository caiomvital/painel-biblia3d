"use client";
import { useCallback, useEffect, useState } from "react";
import { groupExercisesByLesson } from "@/lib/class-exercise-rules";

type ClassOption = { id: string; name: string; status: string; lessons: { id: string; title: string; lessonNumber: number; date: string }[] };
type Choice = { id: string; text: string };
const box = "rounded-xl border border-white/10 bg-white/5 p-4 space-y-3";
const field = "w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white";
const button = "rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50";

export function TeacherExercises({ classes, selectedClassId, onCreated }: { classes: ClassOption[]; selectedClassId: string; onCreated: () => void }) {
  const [classId, setClassId] = useState(selectedClassId || classes.find(c => c.status !== "FINISHED")?.id || "");
  const [lessonId, setLessonId] = useState("");
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<Choice[]>([{ id: "a", text: "" }, { id: "b", text: "" }]);
  const [correct, setCorrect] = useState("a");
  const [rewards, setRewards] = useState({ correctXp: 20, correctCoins: 20, attemptXp: 5, attemptCoins: 5 });
  const [exercises, setExercises] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchExercises = useCallback(async (forClassId: string) => {
    const query = forClassId ? `?classId=${encodeURIComponent(forClassId)}` : "";
    const response = await fetch(`/api/teacher/exercises${query}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao carregar exercícios.");
    return data.exercises as Record<string, unknown>[];
  }, []);
  const load = useCallback(async () => {
    try {
      setExercises(await fetchExercises(classId));
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar exercícios."); }
  }, [classId, fetchExercises]);
  useEffect(() => {
    let active = true;
    fetchExercises(classId)
      .then(result => { if (active) setExercises(result); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Erro ao carregar exercícios."); });
    return () => { active = false; };
  }, [classId, fetchExercises]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/teacher/exercises", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, action: "update", classId, lessonId, title, question, explanation, options, correctOption: correct, ...rewards } : { classId, lessonId, title, question, explanation, options, correctOption: correct, ...rewards }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar exercício.");
      setTitle(""); setQuestion(""); setExplanation(""); setLessonId(""); setOptions([{ id: "a", text: "" }, { id: "b", text: "" }]); setCorrect("a"); setEditingId(null);
      setNotice(editingId ? "Rascunho atualizado." : "Exercício salvo como rascunho."); await load(); onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao criar exercício."); }
    finally { setBusy(false); }
  };

  const publish = async (id: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/teacher/exercises", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "publish" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao publicar exercício.");
      setNotice("Atividade publicada para os alunos."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao publicar exercício."); }
    finally { setBusy(false); }
  };

  const setArchived = async (id: string, archived: boolean) => {
    if (archived && !window.confirm("Arquivar esta atividade? Ela deixará de aparecer para os alunos, e as respostas e recompensas já registradas serão preservadas.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/teacher/exercises", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: archived ? "archive" : "restore" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível alterar a atividade.");
      setNotice(archived ? "Atividade arquivada. As respostas registradas foram preservadas." : "Atividade restaurada para os alunos."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar a atividade."); }
    finally { setBusy(false); }
  };

  const edit = (item: any) => {
    if (Number(item.answerCount) > 0) return;
    setEditingId(item.id); setClassId(item.classId); setLessonId(item.lessonId || ""); setTitle(item.title); setQuestion(item.question); setExplanation(item.explanation || ""); setOptions(item.options); setCorrect(item.correctOption);
    setRewards({ correctXp: item.correctXp, correctCoins: item.correctCoins, attemptXp: item.attemptXp, attemptCoins: item.attemptCoins });
    setError(""); setNotice("");
  };

  const grouped = groupExercisesByLesson(exercises as any[]);

  return <section className="space-y-4">
    <form className={box} onSubmit={save}>
      <h2 className="text-lg font-semibold">{editingId ? "Editar exercício" : "Preparar exercício de múltipla escolha"}</h2>
      <label className="block text-sm">Turma<select className={`${field} mt-1`} value={classId} onChange={e => { setClassId(e.target.value); setLessonId(""); }} required><option value="">Selecione uma turma</option>{classes.filter(c => c.status !== "FINISHED").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="block text-sm">Aula<select className={`${field} mt-1`} value={lessonId} onChange={e => setLessonId(e.target.value)} required><option value="">Selecione a aula que receberá este exercício</option>{(classes.find(c => c.id === classId)?.lessons || []).map(lesson => <option key={lesson.id} value={lesson.id}>Aula {lesson.lessonNumber} — {lesson.title} ({new Date(lesson.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })})</option>)}</select></label>
      <label className="block text-sm">Título<input className={`${field} mt-1`} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required /></label>
      <label className="block text-sm">Pergunta<textarea className={`${field} mt-1`} value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000} rows={3} required /></label>
      <label className="block text-sm">Explicação após a resposta (opcional)<textarea className={`${field} mt-1`} value={explanation} onChange={e => setExplanation(e.target.value)} maxLength={1200} rows={2} placeholder="Explique o conceito para o aluno depois que responder." /></label>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Alternativas (marque a correta)</legend>{options.map((option, index) => <div key={option.id} className="flex items-center gap-2"><input aria-label={`Alternativa ${index + 1} correta`} type="radio" name="correct-option" checked={correct === option.id} onChange={() => setCorrect(option.id)} /><input className={field} aria-label={`Texto da alternativa ${index + 1}`} value={option.text} onChange={e => setOptions(current => current.map(item => item.id === option.id ? { ...item, text: e.target.value } : item))} maxLength={300} required />{options.length > 2 && <button type="button" className={button} onClick={() => { setOptions(current => current.filter(item => item.id !== option.id)); if (correct === option.id) setCorrect(options.find(item => item.id !== option.id)?.id || "a"); }}>Remover</button>}</div>)}{options.length < 6 && <button type="button" className={button} onClick={() => { const id = `option-${Date.now()}`; setOptions(current => [...current, { id, text: "" }]); }}>Adicionar alternativa</button>}</fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="text-sm font-medium">Recompensas</legend>{([["correctXp", "XP pelo acerto"], ["correctCoins", "Coins pelo acerto"], ["attemptXp", "XP pela tentativa incorreta"], ["attemptCoins", "Coins pela tentativa incorreta"]] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input className={`${field} mt-1`} type="number" min="0" max="10000" step="1" value={rewards[key]} onChange={e => setRewards(current => ({ ...current, [key]: Number(e.target.value) }))} required /></label>)}</fieldset>
      <p className="text-xs text-white/60">A recompensa pelo acerto deve ser maior em XP e Coins. Cada aluno poderá responder uma única vez.</p>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || !classId || !lessonId}>{busy ? "Salvando…" : editingId ? "Salvar alterações" : "Salvar rascunho"}</button>{editingId && <button type="button" className={button} disabled={busy} onClick={() => { setEditingId(null); setTitle(""); setQuestion(""); setExplanation(""); }}>Cancelar edição</button>}</div>
    </form>
    <div className="space-y-4"><h2 className="text-lg font-semibold">Atividades por aula</h2>{exercises.length === 0 && <p>Nenhuma atividade nesta seleção.</p>}{grouped.map(group => <section key={group.key} className={box}><h3 className="text-base font-semibold text-amber-300">{group.label}</h3><p className="text-sm text-white/60">{group.items.length} questão(ões)</p>{group.items.map((item: any, index: number) => <article key={item.id} className="space-y-2 border-t border-white/10 pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{item.title || `Questão ${index + 1}`}</h4><span className={`rounded-full px-2 py-1 text-xs ${item.archivedAt ? "bg-slate-500/20 text-white/60" : item.publishedAt ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{item.archivedAt ? "Arquivada" : item.publishedAt ? "Publicada" : "Rascunho"}</span></div><p>{item.question}</p><ul className="list-inside list-disc text-sm text-white/70">{(item.options as Choice[]).map(o => <li key={o.id}>{o.text}{o.id === item.correctOption ? " (correta)" : ""}</li>)}</ul>{item.explanation && <p className="text-sm text-white/70">Explicação: {item.explanation}</p>}{item.publishedAt && <p className="text-sm">Participação: {item.answerCount}/{item.studentCount} aluno(s) · {item.correctCount} acerto(s) · {item.wrongCount} tentativa(s) incorreta(s){item.answerCount ? ` · ${Math.round((item.correctCount / item.answerCount) * 100)}% de acerto` : ""}</p>}{!item.publishedAt && !item.archivedAt && <p className="text-sm text-white/60">Somente você vê este rascunho até publicá-lo.</p>}{item.archivedAt && <p className="text-sm text-white/60">Oculta dos alunos; as respostas e recompensas anteriores foram preservadas.</p>}<div className="flex flex-wrap gap-2">{!item.archivedAt && !item.publishedAt && <button className={button} disabled={busy} onClick={() => void publish(item.id)}>Publicar atividade</button>}{Number(item.answerCount) === 0 ? <button className={button} onClick={() => edit(item)}>Editar</button> : <span className="self-center text-xs text-white/50">Edição bloqueada após a primeira resposta</span>}{item.archivedAt ? <button className={button} disabled={busy} onClick={() => void setArchived(item.id, false)}>Restaurar atividade</button> : <button className={button} disabled={busy} onClick={() => void setArchived(item.id, true)}>Arquivar atividade</button>}</div>{item.publishedAt && <><details className="rounded-lg bg-slate-950/50 p-3"><summary className="cursor-pointer text-sm">Ver respostas dos alunos ({item.answerCount})</summary>{item.answerCount === 0 ? <p className="mt-2 text-sm text-white/60">Ainda não há respostas.</p> : <ul className="mt-2 space-y-2 text-sm">{(item.answers as any[]).map((answer, responseIndex) => <li key={`${item.id}-${responseIndex}`} className="border-t border-white/10 pt-2"><strong>{answer.studentName}</strong> · {answer.isCorrect ? "Acertou" : "Errou"}: {answer.selectedText || "alternativa registrada"} · {answer.xpAwarded} XP / {answer.coinsAwarded} Coins</li>)}</ul>}</details><details className="rounded-lg bg-slate-950/50 p-3"><summary className="cursor-pointer text-sm">Alunos que ainda não responderam ({(item.pendingStudents as any[]).length})</summary>{(item.pendingStudents as any[]).length === 0 ? <p className="mt-2 text-sm text-emerald-300">Todos os alunos ativos responderam.</p> : <ul className="mt-2 list-inside list-disc text-sm">{(item.pendingStudents as any[]).map((student: any) => <li key={student.studentId}>{student.studentName}</li>)}</ul>}</details></>}</article>)}</section>)}</div>
  </section>;
}
