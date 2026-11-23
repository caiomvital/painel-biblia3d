"use client";
import { EventsManager } from "@/components/common/EventsManager";
import { useCallback, useEffect, useState } from "react";
import type { TeacherDashboardData } from "@/lib/academic-service";
import { TeacherEnrollmentManager } from "./TeacherEnrollmentManager";
import { TeacherKids } from "./TeacherKids";
import { TeacherLive } from "./TeacherLive";
import { AttitudesPanel } from "@/components/attitudes/AttitudesPanel";

const areas = [
  "Visão Geral",
  "Minhas Turmas",
  "Aula e Perguntas",
  "Quiz ao vivo",
  "Eventos",
  "Atitudes",
  "Alunos",
] as const;
type Area = (typeof areas)[number];
const labels: Record<string, string> = {
  ACTIVE: "Ativa",
  FINISHED: "Encerrada",
  UPCOMING: "Em breve",
  COMPLETED: "Concluída",
  DROPPED: "Cancelada",
};
const button =
  "rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 disabled:opacity-50 text-sm";
const card = "rounded-xl border border-white/10 bg-white/5 p-4 space-y-3";
export function TeacherView() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [area, setArea] = useState<Area>("Visão Geral");
  const [classId, setClassId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    function onNavigate(event: Event) {
      const detail = (event as CustomEvent<import('@/lib/panel-navigation').PanelTarget>).detail;
      setClassId(detail.classId ?? '');
      setArea(detail.target === 'classes' ? 'Minhas Turmas' : 'Visão Geral');
    }
    window.addEventListener('panel:navigate', onNavigate);
    return () => window.removeEventListener('panel:navigate', onNavigate);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/dashboard", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro de conexão.");
      setData(result);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/dashboard", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Erro de conexão.");
        return result as TeacherDashboardData;
      })
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Erro de conexão.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const selectClass = (id: string) => setClassId(id);
  const removeFromClass = async (enrollmentId: string, studentName: string) => {
    if (!window.confirm(`Remover ${studentName} desta turma? O histórico será preservado.`)) return;
    setBusy(enrollmentId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/teacher/enrollments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: enrollmentId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível remover o aluno da turma.");
      await load();
      setNotice("Aluno removido da turma. O histórico foi preservado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao remover aluno da turma.");
    } finally {
      setBusy("");
    }
  };
  if (!data)
    return (
      <div className="p-6" aria-live="polite">
        {loading ? (
          "Carregando painel do professor…"
        ) : (
          <>
            <p role="alert">{error}</p>
            <button className={button} onClick={load}>
              Tentar novamente
            </button>
          </>
        )}
      </div>
    );
  const selected = data.classes.find((c) => c.id === classId);
  const classes = selected ? [selected] : data.classes;
  const students = (
    <div className="space-y-3">
      {classes.map((c) => (
        <section key={c.id} className={card}>
          <h3 className="font-semibold">{c.name}</h3>
          {c.students.length === 0 && <p>Turma sem alunos.</p>}
          {c.students.map((s) => (
            <article key={s.id} className="border-t border-white/10 pt-3">
              <h4>
                {s.name} · {labels[s.enrollmentStatus]}
              </h4>
              <p>Pontos: {s.currentXp}</p>
              {s.enrollmentStatus === "ACTIVE" && c.status !== "FINISHED" && (
                <button className={button} disabled={busy === s.enrollmentId} onClick={() => void removeFromClass(s.enrollmentId, s.name)}>
                  {busy === s.enrollmentId ? "Removendo…" : "Remover desta turma"}
                </button>
              )}
            </article>
          ))}
          {c.status === "FINISHED" ? <p className="border-t border-white/10 pt-3 text-sm text-white/60">Turma encerrada: as matrículas foram preservadas para consulta.</p> : <TeacherEnrollmentManager classId={c.id} onChanged={load} />}
        </section>
      ))}
    </div>
  );
  return (
    <section className="space-y-5 p-4 md:p-6 min-w-0 break-words text-white">
      <header>
        <h1 className="text-2xl font-bold">Painel do Professor</h1>
        <p>{data.teacher?.name}</p>
      </header>
      <nav aria-label="Área do professor" className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <button
            key={a}
            className={`${button} ${area === a ? "bg-amber-500/20 border-amber-500" : ""}`}
            aria-current={area === a ? "page" : undefined}
            onClick={() => setArea(a)}
          >
            {a}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className={card}>
          {error}{" "}
          <button className={button} onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
      {loading && <p role="status">Atualizando dados…</p>}
      {data.classes.length === 0 && (
        <p>Nenhuma turma atribuída a este professor.</p>
      )}
      {area !== "Visão Geral" && (
        <label className="block">
          Turma{" "}
          <select
            aria-label="Filtrar por turma"
            className="bg-slate-900 rounded p-2 max-w-full"
            value={classId}
            onChange={(e) => selectClass(e.target.value)}
          >
            <option value="">Todas as minhas turmas</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {area === "Visão Geral" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              [data.classes.length, "Turmas atribuídas"],
              [data.classes.reduce((n, c) => n + c.totalStudents, 0), "Alunos ativos"],
            ].map(([value, label]) => (
              <div key={label} className={card}>
                <strong className="text-2xl">{value}</strong>
                <p>{label}</p>
              </div>
            ))}
          </div>
          <section className={card}>
            <h2>Minhas turmas</h2>
            {data.classes.map((c) => (
              <button
                className={`${button} block w-full text-left`}
                key={c.id}
                onClick={() => {
                  selectClass(c.id);
                  setArea("Minhas Turmas");
                }}
              >
                {c.name} · {c.totalStudents} alunos
              </button>
            ))}
          </section>
        </>
      )}
      {area === "Minhas Turmas" && (
        <>
          {classes.map((c) => (
            <article key={c.id} data-testid={`class-${c.id}`} className={card}>
              <button
                className="text-lg font-semibold text-left"
                onClick={() => selectClass(c.id)}
              >
                {c.name}
              </button>
              <p>
                {labels[c.status]} · {c.daysOfWeek} · {c.scheduleTime}
              </p>
              <p>{c.totalStudents} alunos ativos</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Alunos");
                  }}
                >
                  Ver alunos
                </button>
              </div>
            </article>
          ))}
          {selected && (
            <>
              <h2>Alunos matriculados</h2>
              {students}
            </>
          )}
        </>
      )}
      {area === "Aula e Perguntas" && <TeacherKids />}
      {area === "Quiz ao vivo" && <TeacherLive />}
      {area === "Eventos" && <EventsManager />}
      {area === "Atitudes" && <AttitudesPanel />}
      {area === "Alunos" && students}
    </section>
  );
}
