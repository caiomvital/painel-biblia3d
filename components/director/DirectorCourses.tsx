"use client";

import { useState, type FormEvent } from "react";
import type { DirectorDashboardData } from "@/lib/academic-service";
import { api, buttonClass, fieldClass } from "./director-ui";

export function DirectorCourses({ data, onCreated }: { data: DirectorDashboardData; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [workloadHours, setWorkloadHours] = useState("120");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/director/courses", "POST", { name, code, description, workloadHours: Number(workloadHours) });
      setName("");
      setCode("");
      setDescription("");
      setWorkloadHours("120");
      await onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Cursos</h2>
        <p className="text-sm text-slate-400">Cadastre os cursos da escola. Depois, selecione um deles ao criar uma turma.</p>
      </div>
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2">
        <label className="text-sm">Nome do curso<input className={fieldClass} required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="text-sm">Código<input className={fieldClass} required minLength={2} maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,19}" title="Use de 2 a 20 letras, números, hífen ou sublinhado." value={code} onChange={(event) => setCode(event.target.value)} /></label>
        <label className="text-sm">Carga horária (horas)<input className={fieldClass} required type="number" min={1} max={5000} step={1} value={workloadHours} onChange={(event) => setWorkloadHours(event.target.value)} /></label>
        <label className="text-sm sm:col-span-2">Descrição (opcional)<textarea className={fieldClass} maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-rose-300 sm:col-span-2">{error}</p>}
        <div><button className={buttonClass} disabled={busy}>{busy ? "Salvando…" : "Cadastrar curso"}</button></div>
      </form>
      <section className="space-y-3" aria-label="Cursos cadastrados">
        <h3 className="font-semibold">Cursos cadastrados ({data.courses.length})</h3>
        {data.courses.length ? data.courses.map((course) => (
          <article key={course.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h4 className="font-bold">{course.name}</h4>
            <p className="text-sm text-slate-400">Código {course.code} · {course.modules.length} módulos</p>
          </article>
        )) : <p className="text-sm text-slate-400">Nenhum curso cadastrado ainda.</p>}
      </section>
    </section>
  );
}
