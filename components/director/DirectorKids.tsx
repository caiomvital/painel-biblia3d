"use client";
import { useCallback, useEffect, useState } from "react";
import { api, buttonClass, fieldClass } from "./director-ui";
import { matchesQuestion } from "@/lib/question-bank";

type KStudent = {
  id: string; name: string; guardianName: string | null; guardianPhone: string | null;
  birthDate: string | null; points: number; profileCompleted: boolean; accessPending: boolean; className: string | null;
};
type Question = {
  id: string; text: string; options: string[]; correctIndex: number; topic: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED"; source: string;
  kind?: "DAILY" | "WEEKLY"; className?: string | null; classId?: string | null;
};
type Prize = { title: string; description: string | null; pointsGoal: number } | null;
type Ratings = {
  googleReviewUrl: string;
  teachers: { name: string; count: number; average: number | null }[];
  recent: { id: string; student: string; teacher: string; score: number; enjoying: string; comment: string | null; createdAt: string }[];
};
type AdminGame = { id: string; title: string; description: string | null; authorName: string; status: "PENDING" | "APPROVED" | "REJECTED"; isPublic?: boolean; plays: number; navRisk?: boolean };
const enjoyText: Record<string, string> = { YES: "gostando", SO_SO: "mais ou menos", NO: "não muito" };

const panel = "rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3";
const statusText: Record<string, string> = { PENDING: "Aguardando revisão", APPROVED: "Aprovada", REJECTED: "Rejeitada" };

export function DirectorKids({ onCreateStudent }: { onCreateStudent?: () => void }) {
  const [students, setStudents] = useState<KStudent[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [prize, setPrize] = useState<Prize>(null);
  const [ratings, setRatings] = useState<Ratings | null>(null);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [gameFormKey, setGameFormKey] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<KStudent | null>(null);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const reload = useCallback(async () => {
    try {
      const [s, q, p, r, g] = await Promise.all([
        api("/api/director/kids/students"), api("/api/director/kids/questions"), api("/api/director/kids/prize"),
        api("/api/director/kids/ratings"), api("/api/director/kids/games"),
      ]);
      setStudents(s.students); setQuestions(q.questions); setPrize(p.prize); setRatings(r); setGames(g.games); setError("");
    } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(reload, 0); return () => clearTimeout(t); }, [reload]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setNotice(ok); setError(""); await reload(); }
    catch (e: any) { setError(e.message); setNotice(""); }
  };

  const saveStudent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(async () => {
      await api("/api/director/kids/students", "PATCH", {
        id: editing!.id, name: f.get("name"), guardianName: f.get("guardianName"),
        guardianPhone: f.get("guardianPhone"), birthDate: f.get("birthDate"),
      });
      setEditing(null);
    }, "Aluno atualizado.");
  };

  const saveQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      text: f.get("text"), options: [0, 1, 2, 3].map((i) => f.get(`o${i}`)),
      correctIndex: Number(f.get("correct")), topic: f.get("topic"),
    };
    run(async () => {
      if (editingQ && editingQ.id) await api("/api/director/kids/questions", "PATCH", { id: editingQ.id, ...body });
      else await api("/api/director/kids/questions", "POST", body);
      setEditingQ(null);
    }, "Pergunta salva.");
  };

  const savePrize = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(() => api("/api/director/kids/prize", "PUT", {
      title: f.get("title"), description: f.get("description"), pointsGoal: Number(f.get("pointsGoal")),
    }), "Prêmio atualizado.");
  };

  const topics = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean) as string[])).sort();
  const classOptions = Array.from(new Map(questions.filter((q) => q.classId && q.className).map((q) => [q.classId as string, q.className as string])).entries());
  const shown = questions.filter((q) => matchesQuestion(q, { search, status: filter, topic: topicFilter, classId: classFilter }));
  const pending = questions.filter((q) => q.status === "PENDING").length;

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">Prêmio do mês</h3>
        <form key={prize?.title ?? "novo"} onSubmit={savePrize} className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-300 sm:col-span-2">Nome do prêmio
            <input name="title" required defaultValue={prize?.title ?? ""} className={fieldClass} />
          </label>
          <label className="text-xs text-slate-300">Meta de pontos
            <input name="pointsGoal" type="number" min={1} required defaultValue={prize?.pointsGoal ?? 500} className={fieldClass} />
          </label>
          <label className="text-xs text-slate-300 sm:col-span-3">Descrição (opcional)
            <input name="description" defaultValue={prize?.description ?? ""} className={fieldClass} />
          </label>
          <button className={buttonClass} type="submit">Salvar prêmio</button>
        </form>
      </section>

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">Jogos ({games.length})</h3>
        <p className="text-xs text-slate-400">Os jogos rodam isolados (sem acesso à conta nem à internet). Jogos enviados pelas crianças ficam pendentes até você aprovar. Use “Testar” para jogar antes de aprovar.</p>
        <p id="games-test-warning" role="note" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
          ⚠ “Testar” abre o jogo em outra aba. Ele roda isolado, mas pode travar essa aba (por exemplo, com um laço infinito) ou mostrar conteúdo impróprio. Jogue o jogo inteiro antes de aprovar.
        </p>
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id} className="rounded-xl border border-slate-800 p-3 text-sm text-slate-200">
              <p className="font-semibold text-white">{g.title} <span className="text-[11px] font-normal text-slate-400">· por {g.authorName} · {g.isPublic === false ? "só do autor (privado)" : statusText[g.status]} · {g.plays} partida(s)</span></p>
              {g.navRisk && <p role="note" data-testid="game-nav-risk" className="text-xs text-amber-300">⚠ Este código tem endereço externo ou troca de página (location, meta refresh ou link http). Confira antes de aprovar.</p>}
              {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <a className={buttonClass} href={`/api/games/${g.id}/play`} target="_blank" rel="noopener noreferrer" aria-describedby="games-test-warning" title="Abre em outra aba. Pode travar a aba se o jogo tiver laço infinito. Jogue antes de aprovar.">Testar (nova aba)</a>
                {g.status !== "APPROVED" && <button className={buttonClass} onClick={() => run(() => api("/api/director/kids/games", "PATCH", { id: g.id, status: "APPROVED" }), "Jogo aprovado.")}>Aprovar</button>}
                {g.status !== "REJECTED" && <button className={buttonClass} onClick={() => run(() => api("/api/director/kids/games", "PATCH", { id: g.id, status: "REJECTED" }), "Jogo rejeitado.")}>Rejeitar</button>}
                <button className={buttonClass} onClick={() => run(() => api(`/api/director/kids/games?id=${g.id}`, "DELETE"), "Jogo apagado.")}>Apagar</button>
              </div>
            </li>
          ))}
          {!games.length && <li className="text-sm text-slate-400">Nenhum jogo ainda.</li>}
        </ul>
        <form key={gameFormKey} className="grid gap-2 rounded-xl border border-slate-800 p-3 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          run(async () => {
            await api("/api/director/kids/games", "POST", { title: f.get("title"), authorName: f.get("authorName"), description: f.get("description"), html: f.get("html") });
            setGameFormKey((k) => k + 1);
          }, "Jogo publicado.");
        }}>
          <label className="text-xs text-slate-300">Nome do jogo<input name="title" required className={fieldClass} /></label>
          <label className="text-xs text-slate-300">Criado por<input name="authorName" required className={fieldClass} /></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Como se joga (opcional)<input name="description" className={fieldClass} /></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Código HTML do jogo<textarea name="html" required rows={5} className={`${fieldClass} font-mono text-xs`} /></label>
          <button className={buttonClass} type="submit">Publicar jogo</button>
        </form>
      </section>

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">Avaliação dos professores</h3>
        <form key={ratings?.googleReviewUrl ?? "g"} className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          run(() => api("/api/director/kids/ratings", "PUT", { googleReviewUrl: f.get("url") }), "Link do Google salvo.");
        }}>
          <label className="min-w-[240px] flex-1 text-xs text-slate-300">Link de avaliação do Google (opcional)
            <input name="url" type="url" defaultValue={ratings?.googleReviewUrl ?? ""} placeholder="https://g.page/r/..." className={fieldClass} /></label>
          <button className={buttonClass} type="submit">Salvar link</button>
        </form>
        <p className="text-[11px] text-slate-400">O convite para avaliar no Google aparece para todas as crianças depois que elas avaliam o professor, sem importar a nota.</p>
        {ratings && ratings.teachers.length === 0 && <p className="text-sm text-slate-400">Ainda não há avaliações.</p>}
        {ratings?.teachers.map((t) => (
          <p key={t.name} className="text-sm text-slate-200"><span className="font-semibold text-white">{t.name}</span>: média {t.average?.toString().replace(".", ",")} de 10 ({t.count} avaliação(ões))</p>
        ))}
        {ratings && ratings.recent.length > 0 && (
          <ul className="space-y-1 border-t border-slate-800 pt-2 text-xs text-slate-300">
            {ratings.recent.map((r) => (
              <li key={r.id}>{r.student} → {r.teacher}: nota <b>{r.score}</b>, {enjoyText[r.enjoying]}{r.comment ? ` — “${r.comment}”` : ""}</li>
            ))}
          </ul>
        )}
      </section>

      {students.some((s) => s.accessPending) && (
        <section className={`${panel} border-amber-500/40`} data-testid="access-review">
          <h3 className="text-lg font-bold text-white">Aguardando liberação ({students.filter((s) => s.accessPending).length})</h3>
          <p className="text-xs text-slate-400">A criança preenche os próprios dados. Confira, corrija se precisar (Editar) e libere o acesso.</p>
          <ul className="space-y-2">
            {students.filter((s) => s.accessPending).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 p-3 text-sm text-slate-200">
                <div>
                  <p className="font-semibold text-white">{s.name} <span className="text-xs font-normal text-slate-400">· {s.className ?? "sem turma"}</span></p>
                  <p className="text-xs text-slate-400">
                    {s.profileCompleted
                      ? `Nascimento: ${s.birthDate ? s.birthDate.split("-").reverse().join("/") : "—"} · Responsável: ${s.guardianName ?? "—"}`
                      : "Ainda não preencheu os dados."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className={buttonClass} onClick={() => setEditing(s)}>Editar</button>
                  <button className={buttonClass} onClick={() => run(() => api("/api/director/kids/students", "PATCH", { id: s.id, release: true }), `Acesso de ${s.name} liberado.`)}>Liberar acesso</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-white">Alunos ({students.length})</h3>
          {onCreateStudent && <button className={buttonClass} onClick={onCreateStudent}>Cadastrar aluno</button>}
        </div>
        <p className="text-xs text-slate-400">O telefone do responsável é o usuário de login da criança (DDD + número, ex.: 81995474295). Senha inicial: 123.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-slate-400"><tr><th className="py-2">Aluno</th><th>Turma</th><th>Responsável</th><th>Telefone (login)</th><th>Pontos</th><th /></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-800 text-slate-200">
                  <td className="py-2 pr-2">{s.name}{s.accessPending && <span className="ml-2 rounded bg-amber-500/20 px-1.5 text-[11px] text-amber-300">aguardando</span>}</td><td>{s.className ?? "—"}</td><td>{s.guardianName ?? "—"}</td>
                  <td>{s.guardianPhone ?? "—"}</td><td>{s.points}</td>
                  <td className="text-right"><button className={buttonClass} onClick={() => setEditing(s)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing && (
          <form key={editing.id} onSubmit={saveStudent} className="grid gap-3 rounded-xl border border-amber-500/30 p-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Nome da criança<input name="name" required defaultValue={editing.name} className={fieldClass} /></label>
            <label className="text-xs text-slate-300">Nome do responsável<input name="guardianName" defaultValue={editing.guardianName ?? ""} className={fieldClass} /></label>
            <label className="text-xs text-slate-300">Telefone do responsável<input name="guardianPhone" inputMode="numeric" required defaultValue={editing.guardianPhone ?? ""} className={fieldClass} /></label>
            <label className="text-xs text-slate-300">Nascimento<input name="birthDate" type="date" defaultValue={editing.birthDate ?? ""} className={fieldClass} /></label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button className={buttonClass} type="submit">Salvar</button>
              <button className={buttonClass} type="button" onClick={() => setEditing(null)}>Cancelar</button>
              {editing.accessPending && <button className={buttonClass} type="button" onClick={() => run(async () => { await api("/api/director/kids/students", "PATCH", { id: editing.id, release: true }); setEditing(null); }, "Acesso liberado.")}>Liberar acesso</button>}
              <button className={buttonClass} type="button" onClick={() => run(() => api("/api/director/kids/students", "PATCH", { id: editing.id, resetPassword: true }), "Senha redefinida para 123.")}>Redefinir senha para 123</button>
            </div>
          </form>
        )}
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-white">Banco de perguntas ({shown.length} de {questions.length})</h3>
          <div className="flex flex-wrap gap-2">
            {pending > 0 && <button className={buttonClass} onClick={() => run(() => api("/api/director/kids/questions", "POST", { action: "approveAll" }), "Todas as perguntas pendentes foram aprovadas.")}>Aprovar todas pendentes ({pending})</button>}
            <button className={buttonClass} onClick={() => setEditingQ({ id: "", text: "", options: ["", "", "", ""], correctIndex: 0, topic: "", status: "APPROVED", source: "DIRECTOR" })}>Nova pergunta</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`${buttonClass} ${filter === f ? "bg-amber-500/30" : ""}`}>{f === "ALL" ? "Todas" : statusText[f]}</button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-slate-300">Buscar<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Palavra da pergunta ou resposta" className={fieldClass} /></label>
          <label className="text-xs text-slate-300">Tema
            <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className={fieldClass}>
              <option value="">Todos</option>{topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></label>
          <label className="text-xs text-slate-300">Turma
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={fieldClass}>
              <option value="">Todas</option>{classOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select></label>
        </div>
        {editingQ && (
          <form key={editingQ.id || "nova"} onSubmit={saveQuestion} className="space-y-2 rounded-xl border border-amber-500/30 p-3">
            <label className="block text-xs text-slate-300">Pergunta<input name="text" required defaultValue={editingQ.text} className={fieldClass} /></label>
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="flex items-center gap-2 text-xs text-slate-300">
                <input type="radio" name="correct" value={i} defaultChecked={editingQ.correctIndex === i} className="accent-amber-500" />
                <input name={`o${i}`} required placeholder={`Resposta ${i + 1}`} defaultValue={editingQ.options[i] ?? ""} className={fieldClass} />
              </label>
            ))}
            <p className="text-[11px] text-slate-400">A bolinha marca a resposta certa.</p>
            <label className="block text-xs text-slate-300">Tema (opcional)<input name="topic" defaultValue={editingQ.topic ?? ""} className={fieldClass} /></label>
            <div className="flex gap-2"><button className={buttonClass} type="submit">Salvar</button><button className={buttonClass} type="button" onClick={() => setEditingQ(null)}>Cancelar</button></div>
          </form>
        )}
        <ul className="space-y-2">
          {shown.map((q) => (
            <li key={q.id} className="rounded-xl border border-slate-800 p-3 text-sm text-slate-200">
              <p className="font-semibold text-white">{q.text} <span className="ml-1 text-[11px] font-normal text-slate-400">{q.kind === "WEEKLY" ? `· Desafio da semana${q.className ? ` (${q.className})` : ""} ` : "· Desafio do dia "}{q.topic ? `· ${q.topic} ` : ""}· {statusText[q.status]}</span></p>
              <ul className="mt-1 text-xs">{q.options.map((o, i) => <li key={i} className={i === q.correctIndex ? "text-emerald-300" : "text-slate-400"}>{i === q.correctIndex ? "✔ " : "• "}{o}</li>)}</ul>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.status !== "APPROVED" && <button className={buttonClass} onClick={() => run(() => api("/api/director/kids/questions", "PATCH", { id: q.id, status: "APPROVED" }), "Pergunta aprovada.")}>Aprovar</button>}
                {q.status !== "REJECTED" && <button className={buttonClass} onClick={() => run(() => api("/api/director/kids/questions", "PATCH", { id: q.id, status: "REJECTED" }), "Pergunta rejeitada.")}>Rejeitar</button>}
                <button className={buttonClass} onClick={() => setEditingQ(q)}>Editar</button>
                <button className={buttonClass} onClick={async () => {
                  try {
                    const r = await api(`/api/director/kids/questions?id=${q.id}`, "DELETE");
                    setNotice(r?.result === "archived" ? "Pergunta arquivada: ela já foi usada em desafios, então não aparece mais nos próximos." : "Pergunta apagada.");
                    setError(""); await reload();
                  } catch (e: any) { setError(e.message); setNotice(""); }
                }}>Apagar</button>
              </div>
            </li>
          ))}
          {!shown.length && <li className="text-sm text-slate-400">Nenhuma pergunta nesse filtro.</li>}
        </ul>
      </section>
    </div>
  );
}
