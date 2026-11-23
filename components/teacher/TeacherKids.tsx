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

/** O professor envia um jogo (arquivo .html): o servidor confere o código e, se estiver tudo certo, já libera para os alunos. */
function TeacherGameUpload() {
  const [file, setFile] = useState<{ name: string; html: string } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<{ id: string; title: string; description: string | null; plays: number; createdAt: string }[] | null>(null);
  const loadMine = useCallback(async () => {
    try { setMine((await call("/api/teacher/games?mine=1")).games); } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(loadMine, 0); return () => clearTimeout(t); }, [loadMine]);

  const pick = async (f?: File | null) => {
    setError(""); setNotice(""); setFile(null);
    if (!f) return;
    if (!/\.html?$/i.test(f.name)) return setError("Escolha um arquivo .html.");
    if (f.size > 200_000) return setError("O jogo é grande demais (máximo de 200 KB).");
    setFile({ name: f.name, html: await f.text() });
  };

  return (
    <section className={panel} data-testid="teacher-game-upload">
      <h3 className="text-lg font-bold text-white">Enviar jogo para os alunos</h3>
      <p className="text-xs text-slate-400">Escolha um arquivo .html (jogo em um arquivo só). O painel confere o código antes de aceitar: jogos que acessam a internet, abrem outras páginas ou tentam sair do quadro são recusados. Se passar, o jogo já fica disponível para todos os alunos.</p>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
      <form key={formKey} className="grid gap-2 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault(); if (!file) return setError("Escolha o arquivo do jogo.");
        const f = new FormData(e.currentTarget); setBusy(true); setError(""); setNotice("");
        try {
          await call("/api/teacher/games", "POST", { title: f.get("title"), description: f.get("description"), html: file.html });
          setNotice("Jogo publicado! Os alunos já podem jogar."); setFile(null); setFormKey((k) => k + 1); await loadMine();
        } catch (err: any) { setError(err.message); } finally { setBusy(false); }
      }}>
        <label className="text-xs text-slate-300">Nome do jogo<input name="title" required minLength={3} maxLength={60} className={field} /></label>
        <label className="text-xs text-slate-300">Como se joga (opcional)<input name="description" maxLength={200} className={field} /></label>
        <label className="text-xs text-slate-300 sm:col-span-2">Arquivo do jogo (.html)
          <input type="file" name="arquivo" accept=".html,.htm,text/html" data-testid="teacher-game-file" className={field} onChange={(e) => pick(e.target.files?.[0])} /></label>
        {file && <p className="text-xs text-emerald-300 sm:col-span-2">Arquivo escolhido: {file.name}</p>}
        <button className={button} type="submit" disabled={busy || !file}>{busy ? "Conferindo..." : "Enviar jogo"}</button>
      </form>
      <div className="space-y-2 border-t border-white/10 pt-3" data-testid="teacher-my-games">
        <h4 className="text-sm font-bold text-white">Jogos que você enviou ({mine?.length ?? 0})</h4>
        <ul className="space-y-2">
          {(mine ?? []).map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 p-3" data-testid={`my-game-${g.id}`}>
              <div className="min-w-0">
                <p className="font-semibold text-white">{g.title}</p>
                <p className="text-xs text-slate-400">{g.plays} {g.plays === 1 ? "partida" : "partidas"} · enviado em {new Date(g.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Recife" })}{g.description ? ` · ${g.description}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <a className={button} href={`/api/games/${g.id}/play`} target="_blank" rel="noopener noreferrer">Testar</a>
                <button className={button} onClick={async () => {
                  if (!window.confirm(`Apagar o jogo "${g.title}"? Os alunos não poderão mais jogar.`)) return;
                  setError(""); setNotice("");
                  try { await call(`/api/teacher/games?id=${g.id}`, "DELETE"); setNotice("Jogo apagado."); await loadMine(); } catch (e: any) { setError(e.message); }
                }}>Apagar</button>
              </div>
            </li>
          ))}
          {mine && !mine.length && <li className="text-sm text-slate-400">Você ainda não enviou nenhum jogo.</li>}
        </ul>
      </div>
    </section>
  );
}

type ReviewGame = { id: string; title: string; description: string | null; authorName: string; status: "PENDING" | "APPROVED" | "REJECTED"; plays: number; scanProblems: string[] };
const gameStatus: Record<string, string> = { PENDING: "aguardando você", APPROVED: "aprovado", REJECTED: "rejeitado" };

/** O aluno envia o jogo e pede para torná-lo público; o professor testa e aprova ou rejeita. */
function TeacherGameReview() {
  const [games, setGames] = useState<ReviewGame[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { setGames((await call("/api/teacher/games")).games); } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);
  const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
    setError(""); setNotice("");
    try { await call("/api/teacher/games", "PATCH", { id, status }); setNotice(status === "APPROVED" ? "Jogo aprovado. Os colegas já podem jogar." : "Jogo rejeitado."); await load(); }
    catch (e: any) { setError(e.message); }
  };
  return (
    <section className={panel} data-testid="teacher-game-review">
      <h3 className="text-lg font-bold text-white">Jogos dos alunos ({games?.filter((g) => g.status === "PENDING").length ?? 0} para aprovar)</h3>
      <p className="text-xs text-slate-400">Os alunos das suas turmas enviam o jogo e pedem para torná-lo público. Teste antes de aprovar: o jogo só aparece para os colegas depois do seu OK.</p>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
      <ul className="space-y-2">
        {(games ?? []).map((g) => (
          <li key={g.id} className="space-y-1 rounded-xl border border-slate-800 p-3" data-testid={`review-game-${g.id}`}>
            <p className="font-semibold text-white">{g.title} <span className="text-xs font-normal text-slate-400">por {g.authorName} · {gameStatus[g.status]}</span></p>
            {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
            {g.scanProblems.length > 0 && <p role="note" className="text-xs text-amber-300">⚠ A varredura achou: {g.scanProblems.join("; ")}. Não dá para aprovar assim.</p>}
            <div className="flex flex-wrap gap-2">
              <a className={button} href={`/api/games/${g.id}/play`} target="_blank" rel="noopener noreferrer">Testar (nova aba)</a>
              {g.status !== "APPROVED" && <button className={button} disabled={g.scanProblems.length > 0} onClick={() => decide(g.id, "APPROVED")}>Aprovar</button>}
              {g.status !== "REJECTED" && <button className={button} onClick={() => decide(g.id, "REJECTED")}>Rejeitar</button>}
            </div>
          </li>
        ))}
        {games && !games.length && <li className="text-sm text-slate-400">Nenhum aluno pediu para publicar um jogo ainda.</li>}
      </ul>
    </section>
  );
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

      <TeacherGameReview />

      <TeacherGameUpload />

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
