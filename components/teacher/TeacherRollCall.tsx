"use client";
import { useCallback, useEffect, useState } from "react";

type Row = { id: string; name: string; status: string | null };
type Roll = { classId: string; day: string; students: Row[] };

const panel = "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3";
const field = "mt-1 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const button = "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40";

async function call(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Não foi possível concluir.");
  return json;
}

/** Chamada: o professor marca quem veio à aula. Quem veio ganha os pontos de presença (uma vez por aula). */
export function TeacherRollCall({ classes, today }: { classes: { id: string; name: string }[]; today: string }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [day, setDay] = useState(today);
  const [roll, setRoll] = useState<Roll | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      const r: Roll = await call(`/api/teacher/roll-call?classId=${classId}&day=${day}`);
      setRoll(r); setPicked(r.students.filter((s) => s.status === "PRESENT").map((s) => s.id)); setError("");
    } catch (e: any) { setError(e.message); setRoll(null); }
  }, [classId, day]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const students = roll?.students ?? [];
  const locked = (s: Row) => s.status === "PRESENT";
  const all = students.length > 0 && picked.length === students.length;

  const save = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await call("/api/teacher/roll-call", "POST", { classId, day, presentIds: picked });
      setNotice(`Chamada salva: ${r.presents} presente(s) e ${r.absents} falta(s). Cada aluno presente ganha ${r.xpPerPresence} pontos (uma vez por aula).`);
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <section className={panel} data-testid="teacher-roll-call">
      <h2 className="text-lg font-bold text-white">Chamada</h2>
      <p className="text-xs text-slate-400">Marque os alunos que vieram. Quem não for marcado fica com falta. Quem já teve a presença confirmada não muda.</p>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-300">Turma
          <select className={field} value={classId} onChange={(e) => setClassId(e.target.value)} disabled={classes.length === 0}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="text-xs text-slate-300">Data da aula
          <input type="date" className={field} value={day} max={today} onChange={(e) => setDay(e.target.value || today)} /></label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm text-slate-300">Alunos ({picked.length} de {students.length} presentes)</legend>
        <button type="button" className="min-h-11 rounded-xl border border-slate-600 px-3 text-sm text-slate-200" disabled={students.length === 0}
          onClick={() => setPicked(all ? students.filter(locked).map((s) => s.id) : students.map((s) => s.id))}>
          {all ? "Limpar" : "Todos presentes"}
        </button>
        <div className="grid gap-2 sm:grid-cols-2">
          {students.map((s) => (
            <label key={s.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-base ${picked.includes(s.id) ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-slate-700 bg-slate-950/50 text-slate-200"}`}>
              <input type="checkbox" className="size-5" checked={picked.includes(s.id)} disabled={locked(s)} onChange={() => toggle(s.id)} />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {locked(s) && <span className="text-xs text-emerald-300">presença confirmada</span>}
              {s.status === "ABSENT" && !picked.includes(s.id) && <span className="text-xs text-slate-400">falta</span>}
            </label>
          ))}
          {roll && students.length === 0 && <p className="text-sm text-slate-400">Nenhum aluno ativo nesta turma.</p>}
        </div>
      </fieldset>
      <button type="button" className={button} disabled={busy || students.length === 0} onClick={save} data-testid="roll-call-save">{busy ? "Salvando…" : "Salvar chamada"}</button>
    </section>
  );
}
