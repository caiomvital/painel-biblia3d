"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { matchesQuestion } from "@/lib/question-bank";

type Data = {
  classes: { id: string; name: string }[];
  points: number; rank: { position: number; total: number }; today: string;
  rules: { report: number; question: number };
  rating: { average: number | null; count: number; comments: { score: number; comment: string }[] };
  reports: { id: string; className: string; day: string; topics: string[]; answered: number }[];
  questions: { id: string; text: string; options: string[]; correctIndex: number; status: string; topic: string | null; classId: string | null; className: string | null }[];
};

const panel = "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3";
const field = "mt-1 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const button = "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40";
const statusText: Record<string, string> = { PENDING: "aguardando revisão", APPROVED: "aprovada", REJECTED: "rejeitada" };

async function call(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, {
    method, headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Não foi possível concluir.");
  return json;
}

export function TeacherKids() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Data["questions"][number] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [topicFilter, setTopicFilter] = useState("");

  const load = useCallback(async () => {
    try { setData(await call("/api/teacher/kids")); setError(""); }
    catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const submit = async (payload: Record<string, unknown>, ok: (r: any) => string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await call("/api/teacher/kids", "POST", payload);
      setNotice(ok(r)); setFormKey((k) => k + 1); await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const topics = useMemo(() => Array.from(new Set((data?.questions ?? []).map((q) => q.topic).filter(Boolean) as string[])).sort(), [data]);
  const shownQuestions = useMemo(() => (data?.questions ?? []).filter((q) => matchesQuestion(q, { search, status: statusFilter, topic: topicFilter })), [data, search, statusFilter, topicFilter]);

  if (!data) return <p className="text-sm text-slate-300">{error || "Carregando..."}</p>;
  const noClass = data.classes.length === 0;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={panel}><p className="text-xs text-slate-400">Seus pontos de professor</p><p className="text-4xl font-black text-amber-300">⭐ {data.points}</p>
          <p className="text-xs text-slate-400">+{data.rules.report} por aula registrada · +{data.rules.question} por pergunta cadastrada</p></div>
        <div className={panel}><p className="text-xs text-slate-400">Sua posição entre os professores</p><p className="text-4xl font-black text-white">{data.rank.position}º</p>
          <p className="text-xs text-slate-400">de {data.rank.total} professores</p></div>
      </div>

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">Avaliação dos alunos</h3>
        {data.rating.count === 0 ? (
          <p className="text-sm text-slate-400">Ainda ninguém avaliou. As crianças avaliam uma vez por semana.</p>
        ) : (
          <>
            <p className="text-3xl font-black text-amber-300">{data.rating.average?.toString().replace(".", ",")} <span className="text-sm font-normal text-slate-400">de 10 · {data.rating.count} avaliação(ões)</span></p>
            {data.rating.comments.length > 0 && (
              <ul className="space-y-1 text-sm text-slate-200">
                {data.rating.comments.map((c, i) => <li key={i}>“{c.comment}” <span className="text-xs text-slate-400">— nota {c.score}</span></li>)}
              </ul>
            )}
          </>
        )}
      </section>

      {noClass && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Você ainda não tem turma atribuída. Peça à direção para vincular suas turmas.</p>}

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">O que demos na aula de hoje</h3>
        <p className="text-xs text-slate-400">Um tópico por linha (até 10). As crianças veem esta lista como checklist e marcam o que aprenderam.</p>
        <form key={`r${formKey}`} className="space-y-3" onSubmit={(e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          submit({ action: "report", classId: f.get("classId"), day: f.get("day"), topics: String(f.get("topics") ?? "").split("\n") },
            (r) => r.awarded ? `Aula registrada! Você ganhou ${r.awarded} ponto(s).` : "Aula atualizada.");
        }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Turma
              <select name="classId" required disabled={noClass} className={field}>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-xs text-slate-300">Data da aula
              <input name="day" type="date" defaultValue={data.today} max={data.today} className={field} /></label>
          </div>
          <label className="block text-xs text-slate-300">Tópicos
            <textarea name="topics" required rows={5} placeholder={"O que é uma inteligência artificial\nComo fazer um bom pedido (prompt)\nCriamos um objeto 3D"} className={field} /></label>
          <button type="submit" disabled={busy || noClass} className={button}>Registrar aula</button>
        </form>
        {data.reports.length > 0 && (
          <ul className="space-y-2 border-t border-white/10 pt-3 text-sm text-slate-200">
            {data.reports.map((r) => (
              <li key={r.id}><span className="font-semibold text-white">{r.day.split("-").reverse().join("/")} · {r.className}</span>
                <span className="ml-2 text-xs text-slate-400">{r.answered} aluno(s) responderam</span>
                <ul className="ml-4 list-disc text-xs text-slate-300">{r.topics.map((t, i) => <li key={i}>{t}</li>)}</ul></li>
            ))}
          </ul>
        )}
      </section>

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">Meu banco de perguntas ({data.questions.length})</h3>
        <p className="text-xs text-slate-400">Escreva a pergunta, 4 respostas e marque a certa. Depois de aprovadas pela direção, entram no <b>Desafio da semana</b> da turma. Se você editar uma pergunta aprovada, ela volta para a revisão.</p>
        <form key={`q${formKey}-${editing?.id ?? "nova"}`} className="space-y-2" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          const body = { classId: f.get("classId"), text: f.get("text"), topic: f.get("topic"),
            options: [0, 1, 2, 3].map((i) => f.get(`o${i}`)), correctIndex: Number(f.get("correct")) };
          if (!editing) { submit({ action: "question", ...body }, (r) => `Pergunta enviada para revisão! Você ganhou ${r.awarded} pontos.`); return; }
          setBusy(true); setError(""); setNotice("");
          try {
            const r = await call("/api/teacher/kids", "PATCH", { id: editing.id, ...body });
            setNotice(r.backToReview ? "Pergunta salva e enviada de novo para a revisão da direção." : "Pergunta salva.");
            setEditing(null); setFormKey((k) => k + 1); await load();
          } catch (err: any) { setError(err.message); } finally { setBusy(false); }
        }}>
          {editing && <p className="text-xs font-semibold text-amber-200">Editando uma pergunta</p>}
          <label className="block text-xs text-slate-300">Turma
            <select name="classId" required disabled={noClass} defaultValue={editing?.classId ?? undefined} className={field}>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block text-xs text-slate-300">Pergunta<input name="text" required maxLength={300} defaultValue={editing?.text ?? ""} className={field} /></label>
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="flex items-center gap-2 text-xs text-slate-300">
              <input type="radio" name="correct" value={i} defaultChecked={(editing?.correctIndex ?? 0) === i} className="accent-amber-500" />
              <input name={`o${i}`} required maxLength={150} placeholder={`Resposta ${i + 1}`} defaultValue={editing?.options[i] ?? ""} className={field} />
            </label>
          ))}
          <p className="text-[11px] text-slate-400">A bolinha marca a resposta certa.</p>
          <label className="block text-xs text-slate-300">Tema (opcional)<input name="topic" maxLength={60} defaultValue={editing?.topic ?? ""} placeholder="Ex.: tecnologia, tema bíblico" className={field} /></label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || noClass} className={button}>{editing ? "Salvar alterações" : "Enviar pergunta"}</button>
            {editing && <button type="button" className={button} onClick={() => { setEditing(null); setFormKey((k) => k + 1); }}>Cancelar</button>}
          </div>
        </form>
        {data.questions.length > 0 && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-xs text-slate-300">Buscar<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Palavra da pergunta ou resposta" className={field} /></label>
              <label className="text-xs text-slate-300">Situação
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={field}>
                  <option value="ALL">Todas</option><option value="PENDING">Aguardando revisão</option><option value="APPROVED">Aprovadas</option><option value="REJECTED">Rejeitadas ou arquivadas</option>
                </select></label>
              <label className="text-xs text-slate-300">Tema
                <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className={field}>
                  <option value="">Todos</option>{topics.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></label>
            </div>
            <ul className="space-y-2 text-sm text-slate-200">
              {shownQuestions.map((q) => (
                <li key={q.id} className="rounded-xl border border-white/10 p-3">
                  <p className="font-semibold text-white">{q.text} <span className="text-[11px] font-normal text-slate-400">· {q.className ?? "—"}{q.topic ? ` · ${q.topic}` : ""} · {statusText[q.status] ?? q.status}</span></p>
                  <ul className="text-xs">{q.options.map((o, i) => <li key={i} className={i === q.correctIndex ? "text-emerald-300" : "text-slate-400"}>{i === q.correctIndex ? "✔ " : "• "}{o}</li>)}</ul>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className={button} onClick={() => { setEditing(q); setFormKey((k) => k + 1); window.scrollTo?.({ top: 0 }); }}>Editar</button>
                    <button className={button} onClick={async () => {
                      try {
                        const r = await call(`/api/teacher/kids?id=${q.id}`, "DELETE");
                        setNotice(r.result === "archived" ? "Pergunta arquivada: ela já foi usada em desafios, então não aparece mais nos próximos." : "Pergunta apagada.");
                        if (editing?.id === q.id) setEditing(null);
                        await load();
                      } catch (e: any) { setError(e.message); }
                    }}>Apagar</button>
                  </div>
                </li>
              ))}
              {!shownQuestions.length && <li className="text-sm text-slate-400">Nenhuma pergunta nesse filtro.</li>}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
