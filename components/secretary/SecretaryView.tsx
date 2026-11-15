"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Data = {
  classes: { id: string; name: string; code: string; status: string; courseName: string; teacherName: string; daysOfWeek: string; scheduleTime: string; enrolledCount: number }[];
  courses: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  students: { id: string; name: string }[];
};
const button = "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40";
const field = "mt-1 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
export function SecretaryView() {
  const [tab, setTab] = useState<"Turmas">("Turmas");
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [courseId, setCourseId] = useState(""); const [teacherId, setTeacherId] = useState(""); const [daysOfWeek, setDaysOfWeek] = useState(""); const [scheduleTime, setScheduleTime] = useState(""); const [startDate, setStartDate] = useState("");
  const [classId, setClassId] = useState(""); const [studentIds, setStudentIds] = useState<string[]>([]);
  const load = useCallback(async () => { const response = await fetch("/api/secretary/dashboard", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Falha ao carregar o painel."); setData(result); setError(""); }, []);
  useEffect(() => { const controller = new AbortController(); fetch("/api/secretary/dashboard", { cache: "no-store", signal: controller.signal }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Falha ao carregar o painel."); return result as Data; }).then((result) => { setData(result); setError(""); }).catch((e) => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, []);
  useEffect(() => {
    const onNavigate = (event: Event) => {
      const target = (event as CustomEvent<{ target?: string }>).detail?.target;
      if (target === "classes") setTab("Turmas");
    };
    window.addEventListener("panel:navigate", onNavigate);
    return () => window.removeEventListener("panel:navigate", onNavigate);
  }, []);
  async function createClass(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { const response = await fetch("/api/secretary/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, code, courseId, teacherId: teacherId || null, daysOfWeek, scheduleTime, startDate, durationMinutes: 180, lessonsPerWeek: 1 }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Não foi possível criar a turma."); setMessage("Turma criada."); setName(""); setCode(""); setTeacherId(""); setDaysOfWeek(""); setScheduleTime(""); setStartDate(""); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Erro de conexão."); } finally { setBusy(false); } }
  async function bulkEnroll(event: FormEvent) { event.preventDefault(); if (!classId || !studentIds.length) return; setBusy(true); setMessage(""); try { const response = await fetch("/api/staff/enrollments/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, studentIds }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Não foi possível matricular os alunos."); setMessage(`${result.count} aluno(s) matriculado(s).`); setStudentIds([]); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Erro de conexão."); } finally { setBusy(false); } }
  if (error && !data) return <div className="p-6 text-white"><p role="alert">{error}</p><button className={button} onClick={() => void load()}>Tentar novamente</button></div>;
  return <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 text-white">
    <h1 className="text-2xl font-bold">Painel da Secretaria</h1>
    <nav className="flex gap-2">{(["Turmas"] as const).map((item) => <button key={item} className={`${button} ${tab === item ? "bg-amber-500/25" : ""}`} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Turmas" && data && <div className="space-y-5">
      <form onSubmit={createClass} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Criar turma</h2>
        <label>Nome<input required className={field} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Código<input required className={field} value={code} onChange={(e) => setCode(e.target.value)} /></label>
        <label>Curso<select required className={field} value={courseId} onChange={(e) => setCourseId(e.target.value)}><option value="">Selecione</option>{data.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Professor responsável<select className={field} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">Sem professor</option>{data.teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Dias da semana<input required className={field} value={daysOfWeek} onChange={(e) => setDaysOfWeek(e.target.value)} placeholder="TER,QUI" /></label>
        <label>Horário<input required className={field} value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} placeholder="19:00 - 22:00" /></label>
        <label>Data inicial<input required type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <div className="flex items-end"><button className={button} disabled={busy}>{busy ? "Salvando…" : "Criar turma"}</button></div>
      </form>
      <form onSubmit={bulkEnroll} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="font-bold">Matricular vários alunos</h2>
        <label>Turma<select required className={field} value={classId} onChange={(e) => { setClassId(e.target.value); setStudentIds([]); }}><option value="">Selecione</option>{data.classes.filter((item) => item.status !== "FINISHED").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></label>
        <label>Alunos disponíveis<select multiple className={`${field} min-h-40`} value={studentIds} onChange={(e) => setStudentIds(Array.from(e.target.selectedOptions, (option) => option.value))}>{data.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="text-xs text-slate-400">Use Ctrl (ou Command no Mac) para selecionar vários.</span></label>
        <button className={button} disabled={busy || !studentIds.length}>{busy ? "Salvando…" : `Matricular ${studentIds.length || "alunos"}`}</button>
        {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
      </form>
      <section className="space-y-2"><h2 className="font-bold">Turmas</h2>{data.classes.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><p className="font-semibold">{item.name} · {item.code}</p><p className="text-sm text-slate-400">{item.courseName} · {item.teacherName} · {item.daysOfWeek} · {item.scheduleTime} · {item.enrolledCount} alunos</p></article>)}</section>
    </div>}
  </section>;
}
