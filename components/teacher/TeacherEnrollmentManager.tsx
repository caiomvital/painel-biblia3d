"use client";

import { useEffect, useState, type FormEvent } from "react";

type AvailableStudent = { id: string; name: string };
const button = "rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50";

export function TeacherEnrollmentManager({ classId, onChanged }: { classId: string; onChanged: () => Promise<void> }) {
  const [students, setStudents] = useState<AvailableStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch(`/api/teacher/enrollments?classId=${encodeURIComponent(classId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar os alunos disponíveis.");
    setStudents(result.students);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/teacher/enrollments?classId=${encodeURIComponent(classId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível carregar os alunos disponíveis.");
        if (active) setStudents(result.students);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Erro ao carregar alunos."); });
    return () => { active = false; };
  }, [classId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, classId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível matricular o aluno.");
      setStudentId("");
      await Promise.all([load(), onChanged()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao matricular aluno.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-white/10 pt-3">
      <label className="block text-sm">
        Matricular aluno nesta turma
        <select required className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">Selecione um aluno disponível</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
      </label>
      {students.length === 0 && !error && <p className="text-xs text-slate-400">Não há alunos disponíveis para matrícula.</p>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button className={button} disabled={busy || !students.length}>{busy ? "Salvando…" : "Adicionar aluno"}</button>
    </form>
  );
}
