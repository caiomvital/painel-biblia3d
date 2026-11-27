"use client";
import { EventsManager } from "@/components/common/EventsManager";
import { useEffect, useState } from "react";
import type { DirectorDashboardData } from "@/lib/academic-service";
import DirectorAcademicForm, {
  type AcademicEditor,
} from "./DirectorAcademicForm";
import DirectorFinanceControls from "./DirectorFinanceControls";
import { DirectorKids } from "./DirectorKids";
import { AttitudesPanel } from "@/components/attitudes/AttitudesPanel";
import { DirectorCourses } from "./DirectorCourses";
import {
  api,
  buttonClass,
  fieldClass,
  statusLabel,
  dateLabel,
} from "./director-ui";
const tabs = [
  "Visão Geral",
  "Cursos",
  "Turmas",
  "Professores",
  "Gamificação e Leilões",
  "Alunos",
  "Eventos",
  "Atitudes",
] as const;
type Tab = (typeof tabs)[number];
const panel =
  "rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3";
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400 py-3">{children}</p>;
}
export function DirectorView() {
  const [data, setData] = useState<DirectorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("Visão Geral");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<AcademicEditor | null>(null);
  const [kidsKey, setKidsKey] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    function onNavigate(event: Event) {
      const detail = (event as CustomEvent<import('@/lib/panel-navigation').PanelTarget>).detail;
      setClassId(''); setTeacherId(''); setSearch('');
      const mapping: Record<string, Tab> = { overview: 'Visão Geral', registrations: 'Alunos', students: 'Alunos', teachers: 'Professores', classes: 'Turmas', courses: 'Cursos', auction: 'Gamificação e Leilões' };
      setTab(mapping[detail.target] ?? 'Visão Geral');
      if (detail.classId) setClassId(detail.classId);
      if (detail.target === 'classes' && detail.id) setClassId(detail.id);
      if (detail.target === 'teachers' && detail.id) setTeacherId(detail.id);
      if (detail.target === 'auction' && detail.id) window.setTimeout(() => document.querySelector(`[data-testid="auction-${CSS.escape(detail.id!)}"]`)?.scrollIntoView({ block: 'center' }), 500);
    }
    window.addEventListener('panel:navigate', onNavigate);
    return () => window.removeEventListener('panel:navigate', onNavigate);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api("/api/director/dashboard", undefined, undefined, controller.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function reload() {
    const json = await api("/api/director/dashboard");
    setData(json);
    setError("");
  }
  async function retry() {
    setLoading(true);
    try {
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function mutate(url: string, method: string, body: unknown) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await api(url, method, body);
      await reload();
      setNotice("Alteração salva.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: Tab) {
    setTab(next);
    setClassId("");
    setTeacherId("");
    setSearch("");
  }
  function openClass(id: string) {
    navigate("Turmas");
    setClassId(id);
  }
  function editClass(id?: string) {
    const cls = data?.classes.find((c) => c.id === id);
    setEditor({
      kind: "classes",
      id,
      values: cls
        ? {
            name: cls.name,
            code: cls.code,
            courseId: cls.courseId,
            teacherId: cls.teacherId ?? "",
            daysOfWeek: cls.daysOfWeek,
            scheduleTime: cls.scheduleTime,
            durationMinutes: String(cls.durationMinutes),
            lessonsPerWeek: String(cls.lessonsPerWeek),
            startDate: cls.startDate.slice(0, 10),
            endDate: cls.endDate?.slice(0, 10) ?? "",
            status: cls.status,
          }
        : {
            name: "",
            code: "",
            courseId: "",
            teacherId: "",
            daysOfWeek: "",
            scheduleTime: "",
            durationMinutes: "180",
            lessonsPerWeek: "1",
            startDate: "",
            endDate: "",
          },
    });
  }
  function editPerson(kind: "teachers" | "students", id?: string) {
    const person =
      kind === "teachers"
        ? data?.teachers.find((t) => t.id === id)
        : data?.students.find((s) => s.id === id);
    setEditor({
      kind,
      id,
      values: {
        name: person?.name ?? "",
        // o login do aluno é o telefone: ao editar, em branco = não muda
        email: kind === "students" ? "" : (person?.email ?? ""),
        ...(kind === "teachers"
          ? {
              specialty:
                person && "specialty" in person ? (person.specialty ?? "") : "",
            }
          : {
              registrationNumber:
                person && "registrationNumber" in person
                  ? person.registrationNumber
                  : "",
            }),
      },
    });
  }
  if (loading)
    return (
      <p role="status" className="p-6 text-slate-300">
        Carregando painel do diretor…
      </p>
    );
  if (!data)
    return (
      <div className="p-6 text-white">
        <p role="alert">{error || "Não foi possível carregar o painel."}</p>
        <button className={buttonClass} onClick={retry}>
          Tentar novamente
        </button>
      </div>
    );
  const cls = data.classes.find((c) => c.id === classId);
  const teacher = data.teachers.find((t) => t.id === teacherId);
  const query = search.toLocaleLowerCase("pt-BR");
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-6 text-white sm:px-6">
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0b1329] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
          Bíblia 3D • Direção
        </p>
        <h1 className="text-2xl font-black mt-2">Olá, {data.director.name}.</h1>
        <p className="mt-2 text-sm text-slate-400">
          Gestão acadêmica da escola
        </p>
      </header>
      <nav
        aria-label="Áreas do diretor"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2 md:grid-cols-3 xl:grid-cols-8"
      >
        {tabs.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => navigate(t)}
            className={`${buttonClass} ${tab === t ? "bg-amber-500/25 border-amber-400" : ""}`}
          >
            {t}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className="text-rose-300">
          {error}
          <button className={buttonClass} onClick={retry}>
            Atualizar dados
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-emerald-300">
          {notice}
        </p>
      )}
      {tab === "Visão Geral" && (
        <>
          <h2 className="text-lg font-bold">Visão Geral</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              ["Turmas ativas", data.metrics.activeClasses],
              ["Alunos com matrícula ativa", data.metrics.activeStudents],
              ["Professores vinculados", data.metrics.assignedTeachers],
            ].map(([label, value]) => (
              <div
                key={label}
                className={panel}
                data-testid={`metric-${label}`}
              >
                <span className="text-sm text-slate-400">{label}</span>
                <strong className="block text-2xl text-amber-300">
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "Cursos" && <DirectorCourses data={data} onCreated={async () => { await reload(); setNotice("Curso cadastrado. Agora você já pode criar uma turma com ele."); }} />}
      {tab === "Turmas" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Turmas</h2>
            <button
              className={buttonClass}
              disabled={!data.courses.length}
              onClick={() => editClass()}
            >
              Nova Turma
            </button>
          </div>
          {!data.courses.length && (
            <section className={`${panel} max-w-2xl`}>
              <p className="text-sm text-slate-300">Cadastre um curso primeiro. Depois, volte aqui e selecione esse curso ao criar a turma.</p>
              <button className={buttonClass} onClick={() => navigate("Cursos")}>Cadastrar curso</button>
            </section>
          )}
          {cls ? (
            <section className="space-y-4">
              <div className={panel}>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonClass}
                    onClick={() => setClassId("")}
                  >
                    Voltar às turmas
                  </button>
                  <button
                    className={buttonClass}
                    onClick={() => editClass(cls.id)}
                  >
                    Editar turma
                  </button>
                </div>
                <h2 className="font-bold text-xl">{cls.name}</h2>
                <p>
                  {cls.code} • {cls.courseName} • {statusLabel[cls.status]}
                </p>
                <p>
                  {cls.daysOfWeek} • {cls.scheduleTime} • {cls.teacherName}
                </p>
                <p className="text-xs">
                  Módulos do curso:{" "}
                  {data.courses
                    .find((c) => c.id === cls.courseId)
                    ?.modules.map((m) => m.title)
                    .join(", ") || "Nenhum módulo cadastrado"}
                </p>
                <p className="text-sm">{cls.enrolledCount} alunos ativos</p>
              </div>
              <section className={panel}>
                <h3 className="font-bold">Alunos matriculados</h3>
                {cls.enrollments.length ? (
                  cls.enrollments.map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{e.name} • {statusLabel[e.status]}</span>
                      {e.status === "ACTIVE" && <button className={buttonClass} disabled={busy} onClick={() => {
                        if (window.confirm(`Remover ${e.name} desta turma? O histórico será preservado.`)) {
                          void mutate("/api/director/enrollments", "PUT", { id: e.id, status: "DROPPED", reason: "Removido desta turma pela direção." });
                        }
                      }}>Remover da turma</button>}
                    </div>
                  ))
                ) : (
                  <Empty>Turma sem alunos.</Empty>
                )}
              </section>
            </section>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.classes.length ? (
                data.classes.map((c) => (
                  <article
                    key={c.id}
                    data-testid={`class-${c.id}`}
                    className={panel}
                  >
                    <button
                      className="text-left font-bold text-lg text-amber-200"
                      onClick={() => openClass(c.id)}
                    >
                      {c.name}
                    </button>
                    <p>
                      {c.courseName} • {c.code} • {statusLabel[c.status]}
                    </p>
                    <p className="text-sm">
                      {c.teacherName} • {c.daysOfWeek} • {c.scheduleTime}
                    </p>
                    <p className="text-sm">
                      {c.enrolledCount} alunos ativos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass}
                        onClick={() => openClass(c.id)}
                      >
                        Ver turma
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() => editClass(c.id)}
                      >
                        Editar turma
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <Empty>Escola sem turmas.</Empty>
              )}
            </div>
          )}
        </>
      )}
      {tab === "Professores" && (
        <>
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-bold text-lg">Professores</h2>
            <button
              className={buttonClass}
              onClick={() => editPerson("teachers")}
            >
              Cadastrar professor
            </button>
          </div>
          <label>
            Buscar professor
            <input
              className={fieldClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {data.teachers
            .filter((t) => t.name.toLocaleLowerCase("pt-BR").includes(query))
            .map((t) => (
              <article key={t.id} className={panel}>
                <button
                  className="font-bold text-amber-200"
                  onClick={() => setTeacherId(t.id)}
                >
                  {t.name}
                </button>
                <p className="text-sm">
                  {t.specialty || "Especialidade não informada"} •{" "}
                  {t.assignedClassesCount} turmas
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonClass}
                    onClick={() => editPerson("teachers", t.id)}
                  >
                    Editar professor
                  </button>
                  <button
                    className={buttonClass}
                    onClick={() => setTeacherId(t.id)}
                  >
                    Turmas
                  </button>
                </div>
              </article>
            ))}
          {!data.teachers.length && <Empty>Nenhum professor cadastrado.</Empty>}
          {teacher && (
            <section className={panel}>
              <h3 className="font-bold">Turmas de {teacher.name}</h3>
              {!teacher.classIds.length && <Empty>Professor sem turmas.</Empty>}
              {data.classes
                .filter((c) => c.teacherId === teacher.id)
                .map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3">
                    <button
                      className={buttonClass}
                      onClick={() => openClass(c.id)}
                    >
                      {c.name}
                    </button>
                    <button
                      className={buttonClass}
                      disabled={busy}
                      onClick={() =>
                        mutate("/api/director/classes", "PUT", {
                          classId: c.id,
                          teacherId: null,
                        })
                      }
                    >
                      Remover responsabilidade de {c.name}
                    </button>
                  </div>
                ))}
              <label>
                Atribuir turma
                <select
                  aria-label="Atribuir turma"
                  className={fieldClass}
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.teacherName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={buttonClass}
                disabled={busy || !classId}
                onClick={() =>
                  mutate("/api/director/classes", "PUT", {
                    classId,
                    teacherId: teacher.id,
                  })
                }
              >
                Atribuir professor
              </button>
            </section>
          )}
        </>
      )}
      {tab === "Gamificação e Leilões" && (
        <DirectorFinanceControls data={data} onChanged={reload} />
      )}
      {tab === "Alunos" && <DirectorKids key={kidsKey} onCreateStudent={() => editPerson("students")} />}
      {tab === "Eventos" && <EventsManager />}
      {tab === "Atitudes" && <AttitudesPanel />}
      {editor && (
        <DirectorAcademicForm
          key={`${editor.kind}-${editor.id ?? "new"}`}
          editor={editor}
          data={data}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await reload();
            setKidsKey((k) => k + 1);
            setNotice("Cadastro salvo.");
          }}
        />
      )}
    </div>
  );
}
