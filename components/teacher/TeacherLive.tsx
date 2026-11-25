"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LIVE_MAX_QUESTIONS, LIVE_MIN_QUESTIONS, LIVE_SECONDS_DEFAULT } from "@/lib/live-quiz";
import { norm as normalize } from "@/lib/question-bank";

type Pickable = { id: string; text: string; topic: string | null; mine: boolean };
type Row = { id: string; name: string; memberCount: number; points: number; answeredNow: number; correctCount: number; rank: number };
type State = {
  id: string; pin: string; phase: "LOBBY" | "OPEN" | "CLOSED" | "FINISHED"; total: number; index: number; seconds: number; secondsLeft: number;
  question: { text: string; options: string[]; correctIndex: number | null } | null; optionCounts: number[];
  players: { id: string; name: string; teamId: string | null; answered: boolean }[];
  teams: { id: string; name: string }[]; ranking: Row[];
};

const panel = "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3";
const field = "min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const button = "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40";
const OPTION_COLORS = ["border-red-400/60 bg-red-500/15", "border-sky-400/60 bg-sky-500/15", "border-yellow-400/60 bg-yellow-500/15", "border-emerald-400/60 bg-emerald-500/15"];

async function call(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Não foi possível concluir.");
  return json;
}

export function TeacherLive() {
  const [setup, setSetup] = useState<{ currentId: string | null; questions: Pickable[] } | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSetup = useCallback(async () => {
    try {
      const s = await call("/api/teacher/live");
      setSetup(s); setQuizId((cur) => cur ?? s.currentId); setError("");
    } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(loadSetup, 0); return () => clearTimeout(t); }, [loadSetup]);

  // acompanha a sala ao vivo (a cada 1,5 s) até ela ser encerrada
  useEffect(() => {
    if (!quizId) return;
    let stop = false;
    const tick = async () => {
      try { const s: State = await call(`/api/teacher/live?id=${quizId}`); if (!stop) { setState(s); setError(""); } }
      catch (e: any) { if (!stop) setError(e.message); }
    };
    tick();
    const timer = setInterval(() => { if (state?.phase !== "FINISHED") tick(); }, 1500);
    return () => { stop = true; clearInterval(timer); };
  }, [quizId, state?.phase]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!quizId) return;
    setBusy(true); setError("");
    try { await call("/api/teacher/live", "POST", { id: quizId, action, ...extra }); setState(await call(`/api/teacher/live?id=${quizId}`)); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const leave = () => { setQuizId(null); setState(null); setSetup(null); loadSetup(); };

  if (!setup) return <p className="text-sm text-slate-300">{error || "Carregando..."}</p>;
  return (
    <div className="space-y-4" data-testid="teacher-live">
      {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {!quizId && <Creator questions={setup.questions} onCreated={(id) => { setQuizId(id); setState(null); }} onError={setError} />}
      {quizId && !state && !error && <p className="text-sm text-slate-300">Abrindo a sala...</p>}
      {quizId && state && <Room s={state} busy={busy} act={act} onLeave={leave} />}
    </div>
  );
}

function Creator({ questions, onCreated, onError }: { questions: Pickable[]; onCreated: (id: string) => void; onError: (m: string) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(LIVE_SECONDS_DEFAULT);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = useMemo(() => questions.filter((q) => !search || normalize(`${q.text} ${q.topic ?? ""}`).includes(normalize(search))), [questions, search]);
  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length >= LIVE_MAX_QUESTIONS ? p : [...p, id]);
  const create = async () => {
    setBusy(true); onError("");
    try { const r = await call("/api/teacher/live", "POST", { action: "create", questionIds: picked, seconds }); onCreated(r.id); }
    catch (e: any) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <section className={panel}>
      <h2 className="text-lg font-bold">Quiz ao vivo</h2>
      <p className="text-sm text-slate-300">Escolha de {LIVE_MIN_QUESTIONS} a {LIVE_MAX_QUESTIONS} perguntas. Os alunos entram com o PIN e você monta as equipes na hora. Os pontos valem só para o placar da sala.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Buscar
          <input className={`${field} mt-1 block`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="texto ou tema" />
        </label>
        <label className="text-sm">Tempo por pergunta
          <select className={`${field} mt-1 block`} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
            {[10, 15, 20, 30, 45, 60].map((s) => <option key={s} value={s}>{s} segundos</option>)}
          </select>
        </label>
      </div>
      {questions.length === 0 && <p className="text-sm text-slate-300">Você ainda não tem perguntas. Cadastre em &quot;Perguntas&quot;.</p>}
      <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
        {shown.map((q) => (
          <li key={q.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-2 text-sm">
              <input type="checkbox" checked={picked.includes(q.id)} onChange={() => toggle(q.id)} className="mt-1" />
              <span className="min-w-0 flex-1">{q.text}{q.topic && <span className="ml-2 text-xs text-slate-400">#{q.topic}</span>}{!q.mine && <span className="ml-2 text-xs text-slate-400">(banco da escola)</span>}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button type="button" className={button} onClick={create} disabled={busy || picked.length < LIVE_MIN_QUESTIONS} data-testid="live-create">Criar sala</button>
        <span className="text-sm text-slate-300">{picked.length} escolhida(s)</span>
      </div>
    </section>
  );
}

function Room({ s, busy, act, onLeave }: { s: State; busy: boolean; act: (a: string, x?: Record<string, unknown>) => void; onLeave: () => void }) {
  return (
    <div className="space-y-4">
      <section className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className="text-sm text-slate-300">PIN da sala (os alunos digitam no painel deles)</p>
          <p className="text-5xl font-black tracking-[0.3em] text-amber-300" data-testid="live-pin">{s.pin}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.phase !== "FINISHED" && <button type="button" className={button} onClick={() => { if (window.confirm("Encerrar esta sala agora?")) act("finish"); }} disabled={busy}>Encerrar sala</button>}
          {s.phase === "FINISHED" && <button type="button" className={button} onClick={onLeave} data-testid="live-new">Nova sala</button>}
        </div>
      </section>
      {s.phase === "LOBBY" && <Lobby s={s} busy={busy} act={act} />}
      {(s.phase === "OPEN" || s.phase === "CLOSED") && <Playing s={s} busy={busy} act={act} />}
      {s.phase === "FINISHED" && <Podium rows={s.ranking} />}
      {s.phase !== "LOBBY" && <Ranking rows={s.ranking} total={s.players.length} />}
    </div>
  );
}

function Lobby({ s, busy, act }: { s: State; busy: boolean; act: (a: string, x?: Record<string, unknown>) => void }) {
  const serverNames = s.teams.map((t) => t.name);
  const [edit, setEdit] = useState<{ names: string[]; assign: Record<string, string> } | null>(null);
  const names = edit?.names ?? serverNames;
  const assignOf = (pid: string) => edit?.assign[pid] ?? s.teams.find((t) => t.id === s.players.find((p) => p.id === pid)?.teamId)?.name ?? "";
  const current = () => ({ names: [...names], assign: Object.fromEntries(s.players.map((p) => [p.id, assignOf(p.id)])) });
  const addTeam = () => setEdit((e) => { const c = e ?? current(); return { ...c, names: [...c.names, `Equipe ${c.names.length + 1}`] }; });
  const rename = (i: number, v: string) => setEdit((e) => {
    const c = e ?? current(); const old = c.names[i];
    return { names: c.names.map((n, k) => (k === i ? v : n)), assign: Object.fromEntries(Object.entries(c.assign).map(([k, a]) => [k, a === old ? v : a])) };
  });
  const move = (pid: string, team: string) => setEdit((e) => { const c = e ?? current(); return { ...c, assign: { ...c.assign, [pid]: team } }; });
  const split = (n: number) => setEdit(() => {
    const ns = Array.from({ length: n }, (_, i) => `Equipe ${i + 1}`);
    return { names: ns, assign: Object.fromEntries(s.players.map((p, i) => [p.id, ns[i % n]])) };
  });
  const save = async () => {
    const c = current();
    const teams = c.names.map((name) => ({ name, playerIds: s.players.filter((p) => c.assign[p.id] === name).map((p) => p.id) }));
    await act("setTeams", { teams }); setEdit(null);
  };
  const unassigned = s.players.filter((p) => !assignOf(p.id)).length;
  const dupNames = new Set(names).size !== names.length;
  return (
    <section className={panel} data-testid="live-lobby">
      <h2 className="text-lg font-bold">Quem entrou ({s.players.length})</h2>
      {s.players.length === 0 && <p className="text-sm text-slate-300">Esperando os alunos digitarem o PIN...</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={busy || s.players.length === 0} onClick={async () => { await act("soloAll"); setEdit(null); }} data-testid="live-solo">Todos solo</button>
        {[2, 3, 4, 5].map((n) => <button key={n} type="button" className={button} disabled={busy || s.players.length < n} onClick={() => split(n)}>Dividir em {n} equipes</button>)}
        <button type="button" className={button} disabled={busy} onClick={addTeam}>+ Equipe</button>
      </div>
      {names.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {names.map((n, i) => (
            <label key={i} className="text-sm">Nome da equipe {i + 1}
              <input className={`${field} mt-1 block w-full`} value={n} maxLength={30} onChange={(e) => rename(i, e.target.value)} />
            </label>
          ))}
        </div>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {s.players.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-2 text-sm">
            <span className="min-w-0 truncate font-semibold">{p.name}</span>
            <select className={field} value={assignOf(p.id)} onChange={(e) => move(p.id, e.target.value)} aria-label={`Equipe de ${p.name}`}>
              <option value="">sem equipe</option>
              {names.map((n, i) => <option key={i} value={n}>{n}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {dupNames && <p className="text-sm text-amber-200">Duas equipes com o mesmo nome: mude um deles.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={button} disabled={busy || !edit || dupNames} onClick={save} data-testid="live-save-teams">Salvar equipes</button>
        <button type="button" className={`${button} !border-emerald-400/40 !bg-emerald-500/15 !text-emerald-200`} disabled={busy || !!edit || s.players.length === 0 || unassigned > 0}
          onClick={() => act("start")} data-testid="live-start">Começar quiz</button>
        {edit && <span className="text-sm text-slate-300">Salve as equipes para poder começar.</span>}
        {!edit && unassigned > 0 && <span className="text-sm text-slate-300">{unassigned} aluno(s) sem equipe.</span>}
      </div>
    </section>
  );
}

function Playing({ s, busy, act }: { s: State; busy: boolean; act: (a: string, x?: Record<string, unknown>) => void }) {
  const q = s.question; if (!q) return null;
  const answered = s.players.filter((p) => p.answered).length;
  const open = s.phase === "OPEN";
  const last = s.index + 1 >= s.total;
  return (
    <section className={panel} data-testid="live-playing">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
        <span>Pergunta {s.index + 1} de {s.total}</span>
        <span className="font-semibold text-white">{open ? `${s.secondsLeft}s` : "Tempo encerrado"} · {answered} de {s.players.length} responderam</span>
      </div>
      <p className="text-xl font-bold">{q.text}</p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const right = q.correctIndex === i;
          return (
            <li key={i} className={`rounded-xl border-2 p-3 text-sm ${OPTION_COLORS[i % 4]} ${q.correctIndex !== null && !right ? "opacity-50" : ""} ${right ? "ring-2 ring-emerald-300" : ""}`}>
              <span className="font-bold">{i + 1}.</span> {o}{right && <span className="ml-2 font-bold text-emerald-300">✓ certa</span>}
              {!open && <span className="float-right text-xs text-slate-300">{s.optionCounts[i] ?? 0} aluno(s)</span>}
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2">
        {open && <button type="button" className={button} disabled={busy} onClick={() => act("close")} data-testid="live-close">Encerrar pergunta</button>}
        {!open && <button type="button" className={button} disabled={busy} onClick={() => act("next")} data-testid="live-next">{last ? "Ver pódio" : "Próxima pergunta"}</button>}
      </div>
    </section>
  );
}

function Ranking({ rows, total }: { rows: Row[]; total: number }) {
  return (
    <section className={panel} data-testid="live-ranking">
      <h2 className="text-lg font-bold">Ranking ao vivo</h2>
      {rows.length === 0 && <p className="text-sm text-slate-300">Sem pontos ainda ({total} aluno(s) na sala).</p>}
      <ol className="space-y-1">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm">
            <span className="min-w-0 truncate"><b className="mr-2 text-amber-300">{r.rank}º</b>{r.name}<span className="ml-2 text-xs text-slate-400">{r.memberCount} aluno(s)</span></span>
            <span className="font-bold">{r.points} pts</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Podium({ rows }: { rows: Row[] }) {
  const top = rows.filter((r) => r.rank <= 3);
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <section className={`${panel} text-center`} data-testid="live-podium">
      <h2 className="text-2xl font-black">Pódio</h2>
      {top.length === 0 && <p className="text-sm text-slate-300">Ninguém pontuou.</p>}
      <ol className="mx-auto max-w-md space-y-2">
        {top.map((r) => (
          <li key={r.id} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-lg font-bold">
            <span aria-hidden="true">{medal[r.rank - 1]} </span>{r.name} <span className="text-amber-200">· {r.points} pts</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
