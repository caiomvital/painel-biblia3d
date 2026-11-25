"use client";
import { useState } from "react";

type Cls = { id: string; name: string; daysOfWeek: string; scheduleTime: string; totalStudents: number };

const DAYS: [string, string][] = [["SEG", "Segunda"], ["TER", "Terça"], ["QUA", "Quarta"], ["QUI", "Quinta"], ["SEX", "Sexta"], ["SAB", "Sábado"], ["DOM", "Domingo"]];
const field = "mt-1 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const button = "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40";

function parse(c: Cls) {
  const m = /^(\d{2}:\d{2}) - (\d{2}:\d{2})$/.exec(c.scheduleTime);
  const day = DAYS.find(([k]) => c.daysOfWeek.split(",")[0].trim() === k)?.[0] ?? "SAB";
  return { day, start: m?.[1] ?? "", end: m?.[2] ?? "" };
}

function ClassRow({ c, onSaved }: { c: Cls; onSaved: () => void }) {
  const init = parse(c);
  const [day, setDay] = useState(init.day);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const save = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/teacher/classes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId: c.id, daysOfWeek: day, startTime: start, endTime: end }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível salvar.");
      setNotice("Horário salvo."); onSaved();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <article className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4" data-testid={`class-schedule-${c.id}`}>
      <h3 className="font-semibold text-white">{c.name} <span className="text-sm font-normal text-slate-400">· {c.totalStudents} {c.totalStudents === 1 ? "aluno" : "alunos"}</span></h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-300">Dia da aula
          <select className={field} value={day} onChange={(e) => setDay(e.target.value)}>{DAYS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label className="text-xs text-slate-300">Início
          <input type="time" className={field} value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="text-xs text-slate-300">Fim
          <input type="time" className={field} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-300">{notice}</p>}
      <button type="button" className={button} disabled={busy || !start || !end} onClick={save}>{busy ? "Salvando…" : "Salvar horário"}</button>
    </article>
  );
}

/** Dias e horário das turmas do professor (o resto da turma é da direção). */
export function TeacherClasses({ classes, onSaved }: { classes: Cls[]; onSaved: () => void }) {
  return (
    <section className="space-y-3" data-testid="teacher-classes">
      <p className="text-xs text-slate-400">Ajuste o dia e o horário de cada turma. A direção também vê essa informação.</p>
      {classes.map((c) => <ClassRow key={`${c.id}-${c.daysOfWeek}-${c.scheduleTime}`} c={c} onSaved={onSaved} />)}
    </section>
  );
}
