"use client";
import { useCallback, useEffect, useState } from "react";
import type { TeacherDashboardData } from "@/lib/academic-service";
import { LessonDiaryModal } from "@/components/lessons/LessonDiaryModal";
import { TeacherEnrollmentManager } from "./TeacherEnrollmentManager";
import { LessonCreateForm } from "@/components/lessons/LessonCreateForm";
import { TeacherExercises } from "./TeacherExercises";
import { TeacherKids } from "./TeacherKids";

const areas = [
  "Visão Geral",
  "Minhas Turmas",
  "Aulas e Diário",
  "Exercícios",
  "Aula e Perguntas",
  "Presenças",
  "Alunos",
] as const;
type Area = (typeof areas)[number];
const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const labels: Record<string, string> = {
  ACTIVE: "Ativa",
  FINISHED: "Encerrada",
  UPCOMING: "Em breve",
  COMPLETED: "Concluída",
  DROPPED: "Cancelada",
  PRESENT: "Confirmada",
  ABSENT: "Ausência registrada",
  EXCUSED: "Justificada",
  PENDING: "Pendente",
  SCHEDULED: "Programada",
  IN_PROGRESS: "Em andamento",
  CANCELLED: "Cancelada",
};
const button =
  "rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 disabled:opacity-50 text-sm";
const card = "rounded-xl border border-white/10 bg-white/5 p-4 space-y-3";
export function TeacherView() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [area, setArea] = useState<Area>("Visão Geral");
  const [classId, setClassId] = useState("");
  const [lessonFilter, setLessonFilter] = useState("");
  const [diary, setDiary] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    function onNavigate(event: Event) {
      const detail = (event as CustomEvent<import('@/lib/panel-navigation').PanelTarget>).detail;
      setClassId(detail.classId ?? ''); setLessonFilter(''); setResolved(false);
      setArea(detail.target === 'attendance' ? 'Presenças' : detail.target === 'overview' ? 'Visão Geral' : detail.target === 'classes' ? 'Minhas Turmas' : 'Aulas e Diário');
      if (detail.target === 'diary' && detail.id) setDiary(detail.id);
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
  const selectClass = (id: string) => {
    setClassId(id);
    setLessonFilter("");
  };
  const openLesson = (id: string, cls: string) => {
    selectClass(cls);
    setArea("Aulas e Diário");
    setDiary(id);
  };
  const decision = async (id: string, action: "confirm" | "reject") => {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/teacher/attendance/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId: id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Falha ao resolver presença.");
      await load();
      setNotice(action === "confirm" ? "Presença confirmada." : "Solicitação de presença recusada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao resolver presença.");
    } finally {
      setBusy("");
    }
  };
  const removeFromClass = async (enrollmentId: string, studentName: string) => {
    if (!window.confirm(`Remover ${studentName} desta turma? O histórico de aulas e presenças será preservado.`)) return;
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
      setNotice("Aluno removido da turma. O histórico de aulas e presenças foi preservado.");
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
  const lessons = classes.flatMap((c) => c.lessons);
  const attendances = data.attendances.filter(
    (a) =>
      (!classId || a.classId === classId) &&
      (!lessonFilter || a.lessonId === lessonFilter),
  );
  const schedule = (
    <div className="space-y-3">
      <LessonCreateForm key={classId || "all-classes"} classes={data.classes.map((item) => ({ id: item.id, name: item.name, scheduleTime: item.scheduleTime, status: item.status }))} selectedClassId={classId} onCreated={load} buttonClass={button} fieldClass="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
      {lessons.length === 0 && <p>Nenhuma aula cadastrada.</p>}
      {lessons.map((l) => (
        <article key={l.id} data-testid={`lesson-${l.id}`} className={card}>
          <h3 className="font-semibold">
            Aula {l.lessonNumber} — {l.title}
          </h3>
          <p>
            {l.className} · {date(l.date)} · {l.scheduleTime}
          </p>
          <p>
            {labels[l.status]}
            {l.isPast ? " · Data passada" : ""} ·{" "}
            {l.taughtTopics.length
              ? "Conteúdo ministrado registrado"
              : "Diário ainda não preenchido"}
          </p>
          <p>
            Planejado:{" "}
            {l.plannedTopics.join(" • ") || "Sem tópicos planejados."}
          </p>
          <p>Ministrado: {l.taughtTopics.join(" • ") || "Sem registro."}</p>
          <button
            className={button}
            onClick={() => openLesson(l.id, l.classId)}
          >
            Editar Diário
          </button>
        </article>
      ))}
    </div>
  );
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
              <p>
                {s.confirmedCount} presenças · {s.absentCount} ausências
                registradas · {s.pendingCount} pendências
              </p>
              <p>
                Frequência:{" "}
                {s.attendanceRate === null
                  ? "Sem registros resolvidos"
                  : `${s.attendanceRate}% (${s.confirmedCount}/${s.resolvedCount} registros resolvidos)`}{" "}
                · XP acumulado: {s.currentXp}
              </p>
              {s.pendingCount > 0 && (
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Presenças");
                    setResolved(false);
                  }}
                >
                  Consultar pendências
                </button>
              )}
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
      <p className="text-sm text-white/60">
        Frequência calculada sobre registros de presença resolvidos. Aulas sem
        registro não são consideradas faltas.
      </p>
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
            onChange={(e) => {
              selectClass(e.target.value);
              setLessonFilter("");
            }}
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
              [data.indicators.scheduled, "Aulas programadas"],
              [data.indicators.past, "Aulas com data passada"],
              [data.indicators.completed, "Aulas concluídas no sistema"],
              [data.indicators.diaries, "Diários preenchidos"],
              [data.pendingAttendances.length, "Solicitações pendentes"],
            ].map(([value, label]) => (
              <div key={label} className={card}>
                <strong className="text-2xl">{value}</strong>
                <p>{label}</p>
              </div>
            ))}
          </div>
          <section className={card}>
            <h2 className="font-semibold">Próximas aulas</h2>
            {data.classes.flatMap(c => c.lessons.map(l => ({ ...l, className: c.name, classId: c.id })))
              .filter(l => new Date(l.date).getTime() >= new Date().setHours(0, 0, 0, 0) && l.status !== "CANCELLED")
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 5).map(l => <article key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <div><p className="font-medium">{l.className} · {l.title}</p><p className="text-sm text-white/60">{date(l.date)} · {l.scheduleTime}</p></div>
                <button className={button} onClick={() => openLesson(l.id, l.classId)}>Abrir diário</button>
              </article>)}
            {data.classes.flatMap(c => c.lessons).filter(l => new Date(l.date).getTime() >= new Date().setHours(0, 0, 0, 0) && l.status !== "CANCELLED").length === 0 && <p>Nenhuma próxima aula programada.</p>}
          </section>
          <section className={card}>
            <h2 className="font-semibold">Pendências de presença</h2>
            {data.pendingAttendances.length === 0 && (
              <p>Nenhuma presença pendente.</p>
            )}
            {data.pendingAttendances.map((a) => (
              <button
                key={a.id}
                className={`${button} block text-left w-full`}
                onClick={() => {
                  selectClass(a.classId);
                  setLessonFilter(a.lessonId);
                  setResolved(false);
                  setArea("Presenças");
                }}
              >
                {a.studentName} · {a.className} · {a.lessonTitle} ·{" "}
                {date(a.date)}
              </button>
            ))}
          </section>
          <section className={card}>
            <h2 className="font-semibold">Diários pendentes</h2>
            <p className="text-sm">
              Aulas concluídas ou com data passada sem tópicos ministrados. Isso não indica
              ausência do professor ou punição.
            </p>
            {data.pendingDiaries.length === 0 && <p>Nenhum diário pendente.</p>}
            {data.pendingDiaries.map((l) => (
              <button
                key={l.id}
                className={`${button} block text-left w-full`}
                onClick={() => openLesson(l.id, l.classId)}
              >
                {l.className} · {l.title} · {date(l.date)}
              </button>
            ))}
          </section>
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
                {c.name} ·{" "}
                {c.nextLesson
                  ? `${date(c.nextLesson.date)} — ${c.nextLesson.title}`
                  : "Sem próxima aula"}
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
                {c.courseName} · {labels[c.status]} · {c.daysOfWeek} ·{" "}
                {c.scheduleTime}
              </p>
              <p>
                {c.totalStudents} alunos ativos · Próxima aula:{" "}
                {c.nextLesson
                  ? `${date(c.nextLesson.date)} — ${c.nextLesson.title}`
                  : "Não programada"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Aulas e Diário");
                  }}
                >
                  Diário de Aulas / Cronograma
                </button>
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Alunos");
                  }}
                >
                  Ver alunos
                </button>
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Presenças");
                    setResolved(false);
                  }}
                >
                  Presenças pendentes
                </button>
              </div>
            </article>
          ))}
          {selected && (
            <>
              <h2>Cronograma</h2>
              {schedule}
              <h2>Alunos matriculados</h2>
              {students}
            </>
          )}
        </>
      )}
      {area === "Exercícios" && <TeacherExercises key={classId} classes={data.classes.map(c => ({ id: c.id, name: c.name, status: c.status, lessons: c.lessons }))} selectedClassId={classId} onCreated={load} />}
      {area === "Aula e Perguntas" && <TeacherKids />}
      {area === "Aulas e Diário" && schedule}
      {area === "Alunos" && students}
      {area === "Presenças" && (
        <>
          <label className="block">
            Aula{" "}
            <select
              aria-label="Filtrar por aula"
              className="bg-slate-900 p-2 rounded max-w-full"
              value={lessonFilter}
              onChange={(e) => setLessonFilter(e.target.value)}
            >
              <option value="">Todas as aulas</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className={button}
              onClick={() => setResolved(false)}
              aria-pressed={!resolved}
            >
              Pendentes
            </button>
            <button
              className={button}
              onClick={() => setResolved(true)}
              aria-pressed={resolved}
            >
              Resolvidas
            </button>
          </div>
          {attendances.filter((a) =>
            resolved ? a.status !== "PENDING" : a.status === "PENDING",
          ).length === 0 && (
            <p>
              {resolved
                ? "Nenhuma presença resolvida."
                : "Nenhuma presença pendente."}
            </p>
          )}
          {attendances
            .filter((a) =>
              resolved ? a.status !== "PENDING" : a.status === "PENDING",
            )
            .map((a) => (
              <article
                key={a.id}
                data-testid={`attendance-${a.id}`}
                className={card}
              >
                <h3>{a.studentName}</h3>
                <p>
                  {a.className} · {a.lessonTitle} · {date(a.date)}
                </p>
                <p>
                  {a.status === "ABSENT" && a.rejectionReason
                    ? "Solicitação rejeitada"
                    : labels[a.status]}
                </p>
                {a.justification && <p>Justificativa: {a.justification}</p>}
                {a.rejectionReason && <p>{a.rejectionReason}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() => openLesson(a.lessonId, a.classId)}
                  >
                    Abrir aula
                  </button>
                  {a.status === "PENDING" && (
                    <>
                      <button
                        className={button}
                        disabled={!!busy}
                        onClick={() => decision(a.id, "confirm")}
                      >
                        Confirmar
                      </button>
                      <button
                        className={button}
                        disabled={!!busy}
                        onClick={() => decision(a.id, "reject")}
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
        </>
      )}
      {diary && (
        <LessonDiaryModal
          isOpen
          lessonId={diary}
          userRole="PROFESSOR"
          onClose={() => setDiary(null)}
          onSaved={load}
        />
      )}
    </section>
  );
}
