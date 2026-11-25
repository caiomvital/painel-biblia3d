"use client";
import { useCallback, useEffect, useState } from "react";
import type { TeacherDashboardData } from "@/lib/academic-service";
import { TeacherKids } from "./TeacherKids";
import { TeacherLive } from "./TeacherLive";
import { AttitudesPanel } from "@/components/attitudes/AttitudesPanel";

/** Área do professor (v1): poucas tarefas, cada uma num botão grande. */
const areas = [
  { id: "Aula de hoje", icon: "📖", hint: "Registre os tópicos" },
  { id: "Atitudes", icon: "⭐", hint: "Elogie ou chame atenção" },
  { id: "Perguntas", icon: "❓", hint: "Desafio da semana" },
  { id: "Quiz ao vivo", icon: "🏆", hint: "Na sala de aula" },
  { id: "Jogos", icon: "🎮", hint: "Publique um jogo" },
] as const;
type Area = (typeof areas)[number]["id"];

const button = "rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 disabled:opacity-50 text-sm";

export function TeacherView() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [area, setArea] = useState<Area>("Aula de hoje");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/dashboard", { cache: "no-store" });
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
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (!data)
    return (
      <div className="p-6" aria-live="polite">
        {loading ? (
          "Carregando painel do professor…"
        ) : (
          <>
            <p role="alert">{error}</p>
            <button className={button} onClick={load}>Tentar novamente</button>
          </>
        )}
      </div>
    );

  return (
    <section className="min-w-0 space-y-5 break-words p-4 text-white md:p-6">
      <header>
        <h1 className="text-2xl font-bold">Painel do Professor</h1>
        <p>{data.teacher?.name}</p>
        {data.classes.length > 0 && (
          <p className="mt-1 text-sm text-white/60">
            {data.classes.map((c) => `${c.name} (${c.totalStudents} ${c.totalStudents === 1 ? "aluno" : "alunos"})`).join(" · ")}
          </p>
        )}
      </header>

      <nav aria-label="Área do professor" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {areas.map((a) => (
          <button
            key={a.id}
            aria-label={a.id}
            aria-current={area === a.id ? "page" : undefined}
            onClick={() => setArea(a.id)}
            className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition hover:bg-white/10 ${area === a.id ? "border-amber-500 bg-amber-500/20" : "border-white/15 bg-white/5"}`}
          >
            <span aria-hidden="true" className="text-3xl">{a.icon}</span>
            <span className="font-semibold">{a.id}</span>
            <span className="text-xs text-white/60">{a.hint}</span>
          </button>
        ))}
      </nav>

      {error && (
        <div role="alert" className="rounded-xl border border-white/10 bg-white/5 p-4">
          {error} <button className={button} onClick={load}>Tentar novamente</button>
        </div>
      )}
      {data.classes.length === 0 && <p>Nenhuma turma atribuída a este professor. Peça à direção para vincular suas turmas.</p>}

      {area === "Aula de hoje" && <TeacherKids section="aula" />}
      {area === "Atitudes" && <AttitudesPanel />}
      {area === "Perguntas" && <TeacherKids section="perguntas" />}
      {area === "Quiz ao vivo" && <TeacherLive />}
      {area === "Jogos" && <TeacherKids section="jogos" />}
    </section>
  );
}
