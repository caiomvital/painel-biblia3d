"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Def = { code: string; label: string; kind: "POSITIVE" | "ATTENTION"; xp: number; coins: number };
type Setup = { classes: { id: string; name: string }[]; catalog: Def[]; limits: { positivePerStudentPerDay: number; perActorPerDay: number } };
type Stu = { id: string; name: string };
type Result = { studentId: string; status: "OK" | "DUPLICATE" | "LIMIT" | "NOT_IN_CLASS"; message?: string };
type Row = { id: string; kind: string; label: string; xp: number; coins: number; note: string | null; createdAt: string; studentName: string; className: string; by: string };

const panel = "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3";
const field = "mt-1 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white";

async function call(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, {
    method, headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Não foi possível concluir.");
  return json;
}
const newBatchId = () => `b${crypto.randomUUID().replace(/-/g, "")}`;

/** Registro de atitudes em poucos toques (celular): turma, alunos, atitude. Valores e limites vêm do servidor. */
export function AttitudesPanel() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Stu[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<Row[]>([]);
  const [histStudent, setHistStudent] = useState("");
  // um id por "toque": se a rede falhar e o professor tocar de novo, o servidor reconhece o mesmo pedido
  const batch = useRef(newBatchId());

  useEffect(() => {
    call("/api/attitudes").then((s: Setup) => { setSetup(s); if (s.classes[0]) setClassId(s.classes[0].id); }).catch((e) => setError(e.message));
  }, []);

  const loadStudents = useCallback(async (id: string) => {
    if (!id) return;
    try { setStudents((await call(`/api/attitudes?view=students&classId=${encodeURIComponent(id)}`)).students); setPicked([]); }
    catch (e: any) { setError(e.message); }
  }, []);
  const loadHistory = useCallback(async (id: string, student: string) => {
    try {
      const q = new URLSearchParams({ view: "history", classId: id, studentId: student });
      setHistory((await call(`/api/attitudes?${q}`)).items);
    } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => {
    if (!classId) return;
    const t = setTimeout(() => { loadStudents(classId); loadHistory(classId, ""); }, 0);
    return () => clearTimeout(t);
  }, [classId, loadStudents, loadHistory]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const send = async (def: Def) => {
    if (busy || picked.length === 0) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const r: { results: Result[] } = await call("/api/attitudes", "POST", {
        classId, studentIds: picked, code: def.code, batchId: batch.current, note: def.kind === "ATTENTION" ? note : undefined,
      });
      const name = (id: string) => students.find((s) => s.id === id)?.name ?? "Aluno";
      const ok = r.results.filter((x) => x.status === "OK" || x.status === "DUPLICATE").length;
      const bad = r.results.filter((x) => x.status === "LIMIT" || x.status === "NOT_IN_CLASS");
      setNotice(`${def.label}: registrado para ${ok} aluno(s).${bad.length ? " " + bad.map((b) => `${name(b.studentId)}: ${b.message}`).join(" ") : ""}`);
      batch.current = newBatchId(); setPicked([]); setNote("");
      await loadHistory(classId, histStudent);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (!setup) return <p className="text-sm text-slate-300">{error || "Carregando..."}</p>;
  if (setup.classes.length === 0) return <p className="text-sm text-slate-300">Você ainda não tem turma para registrar atitudes.</p>;
  const positives = setup.catalog.filter((d) => d.kind === "POSITIVE");
  const attention = setup.catalog.find((d) => d.kind === "ATTENTION");

  return (
    <div className="space-y-4" data-testid="attitudes-panel">
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}

      <section className={panel}>
        <h2 className="text-lg font-bold text-white">Registrar atitude</h2>
        <label className="block text-sm text-slate-300">Turma
          <select className={field} value={classId} onChange={(e) => { setClassId(e.target.value); setHistStudent(""); }}>
            {setup.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm text-slate-300">Alunos ({picked.length} escolhido(s))</legend>
          <button type="button" className="min-h-11 rounded-xl border border-slate-600 px-3 text-sm text-slate-200"
            onClick={() => setPicked(picked.length === students.length ? [] : students.map((s) => s.id))}>
            {picked.length === students.length && students.length > 0 ? "Limpar" : "Escolher todos"}
          </button>
          <div className="grid gap-2 sm:grid-cols-2">
            {students.map((s) => (
              <label key={s.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-base ${picked.includes(s.id) ? "border-amber-400 bg-amber-500/15 text-white" : "border-slate-700 text-slate-200"}`}>
                <input type="checkbox" className="size-5" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
                {s.name}
              </label>
            ))}
            {students.length === 0 && <p className="text-sm text-slate-400">Nenhum aluno ativo nesta turma.</p>}
          </div>
        </fieldset>

        <div className="grid gap-2 sm:grid-cols-2">
          {positives.map((d) => (
            <button key={d.code} type="button" disabled={busy || picked.length === 0} onClick={() => send(d)}
              className="min-h-14 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-left text-base font-semibold text-emerald-200 disabled:opacity-40">
              {d.label} <span className="block text-xs font-normal text-emerald-300/80">+{d.xp} pontos · +{d.coins} fichas</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">Limite: {setup.limits.positivePerStudentPerDay} atitudes positivas por aluno por dia e {setup.limits.perActorPerDay} registros seus por dia.</p>

        {attention && (
          <div className="space-y-2 rounded-xl border border-slate-700 p-3">
            <p className="text-sm font-semibold text-slate-200">{attention.label} <span className="font-normal text-slate-400">(privado: o aluno não vê e não perde nada)</span></p>
            <label className="block text-sm text-slate-300">Anotação (opcional)
              <input className={field} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="button" disabled={busy || picked.length === 0} onClick={() => send(attention)}
              className="min-h-12 rounded-xl border border-slate-500 px-4 text-base font-semibold text-slate-100 disabled:opacity-40">Registrar ponto de atenção</button>
          </div>
        )}
      </section>

      <section className={panel}>
        <h2 className="text-lg font-bold text-white">Histórico</h2>
        <label className="block text-sm text-slate-300">Filtrar por aluno
          <select className={field} value={histStudent} onChange={(e) => { setHistStudent(e.target.value); loadHistory(classId, e.target.value); }}>
            <option value="">Todos da turma</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <ul className="space-y-2" data-testid="attitude-history">
          {history.map((h) => (
            <li key={h.id} className="rounded-xl border border-slate-800 p-3 text-sm text-slate-200">
              <b>{h.studentName}</b> · {h.label}{h.kind === "POSITIVE" ? ` (+${h.xp} pontos, +${h.coins} fichas)` : " (privado)"}
              <span className="block text-xs text-slate-400">{new Date(h.createdAt).toLocaleString("pt-BR")} · {h.className}{h.by ? ` · ${h.by}` : ""}{h.note ? ` · ${h.note}` : ""}</span>
            </li>
          ))}
          {history.length === 0 && <li className="text-sm text-slate-400">Nada registrado ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
