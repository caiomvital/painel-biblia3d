"use client";
import { useCallback, useEffect, useState } from "react";
import { eventCountdown, eventWhen } from "@/lib/event-format";

type Ev = { id: string; title: string; description: string | null; location: string | null; startsAt: string; className: string | null; createdByName: string; mine: boolean };
type Data = { events: Ev[]; classes: { id: string; name: string }[]; canSchoolWide: boolean };

const panel = "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3";
const field = "mt-1 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const button = "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40";

async function call(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Não foi possível concluir.");
  return json;
}

/** Eventos da escola (culto, gincana, aula especial). Os alunos veem na aba Eventos e no cartão da tela inicial. */
export function EventsManager() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    try { setData(await call("/api/events")); } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  if (!data) return <p className="text-sm text-slate-300">{error || "Carregando..."}</p>;
  const now = Date.now();
  const upcoming = data.events.filter((e) => new Date(e.startsAt).getTime() >= now - 3 * 3600 * 1000);
  const past = data.events.filter((e) => new Date(e.startsAt).getTime() < now - 3 * 3600 * 1000).reverse().slice(0, 10);
  const noClass = !data.canSchoolWide && data.classes.length === 0;

  const row = (e: Ev, old?: boolean) => {
    const w = eventWhen(e.startsAt);
    return (
      <li key={e.id} className={`flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-800 p-3 ${old ? "opacity-60" : ""}`} data-testid={`staff-event-${e.id}`}>
        <div className="min-w-0">
          <p className="font-semibold text-white">{e.title}</p>
          <p className="text-xs text-slate-300">{w.weekday}, {w.day} às {w.time}{e.location ? ` · ${e.location}` : ""}</p>
          <p className="text-xs text-slate-400">{e.className ?? "Toda a escola"} · criado por {e.createdByName}{!old ? ` · ${eventCountdown(e.startsAt)}` : ""}</p>
          {e.description && <p className="mt-1 text-xs text-slate-300">{e.description}</p>}
        </div>
        {(e.mine || data.canSchoolWide) && (
          <button className={button} onClick={async () => {
            setError(""); setNotice("");
            try { await call(`/api/events?id=${e.id}`, "DELETE"); setNotice("Evento apagado."); await load(); } catch (err: any) { setError(err.message); }
          }}>Apagar</button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4" data-testid="events-manager">
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">Marcar um evento</h3>
        <p className="text-xs text-slate-400">
          {data.canSchoolWide ? "Vale para a escola toda ou só para uma turma." : "Vale para a turma que você escolher."} Os alunos veem o evento na aba Eventos, e o próximo aparece na tela inicial deles.
        </p>
        {noClass && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Você ainda não tem turma atribuída. Peça à direção para vincular suas turmas.</p>}
        <form key={formKey} className="grid gap-2 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          setBusy(true); setError(""); setNotice("");
          try {
            await call("/api/events", "POST", { title: f.get("title"), description: f.get("description"), location: f.get("location"), startsAt: f.get("startsAt"), classId: f.get("classId") });
            setNotice("Evento marcado! Os alunos já podem ver."); setFormKey((k) => k + 1); await load();
          } catch (err: any) { setError(err.message); } finally { setBusy(false); }
        }}>
          <label className="text-xs text-slate-300">Nome do evento<input name="title" required minLength={3} maxLength={80} placeholder="Ex.: Gincana bíblica" className={field} /></label>
          <label className="text-xs text-slate-300">Data e hora (horário de Recife)<input name="startsAt" type="datetime-local" required className={field} /></label>
          <label className="text-xs text-slate-300">Local (opcional)<input name="location" maxLength={80} placeholder="Ex.: Sala 2" className={field} /></label>
          <label className="text-xs text-slate-300">Para quem
            <select name="classId" required={!data.canSchoolWide} className={field}>
              {data.canSchoolWide && <option value="">Toda a escola</option>}
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Detalhes (opcional)<input name="description" maxLength={300} placeholder="O que levar, como participar…" className={field} /></label>
          <button className={button} type="submit" disabled={busy || noClass}>{busy ? "Salvando..." : "Marcar evento"}</button>
        </form>
      </section>

      <section className={panel}>
        <h3 className="text-lg font-bold text-white">Próximos eventos ({upcoming.length})</h3>
        <ul className="space-y-2">
          {upcoming.map((e) => row(e))}
          {!upcoming.length && <li className="text-sm text-slate-400">Nenhum evento marcado.</li>}
        </ul>
      </section>

      {past.length > 0 && (
        <section className={panel}>
          <h3 className="text-lg font-bold text-white">Já aconteceram</h3>
          <ul className="space-y-2">{past.map((e) => row(e, true))}</ul>
        </section>
      )}
    </div>
  );
}
