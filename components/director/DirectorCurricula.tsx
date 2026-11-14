'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Download, FileText, Search } from 'lucide-react';

type Curriculum = {
  id: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: string;
  student: { id: string; name: string; email: string; registrationNumber: string | null; className: string | null; courseName: string | null };
};
const button = 'inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50';

export function DirectorCurricula() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (nextPage: number, q: string, append = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(nextPage), q });
      const response = await fetch(`/api/director/curriculums?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar currículos.');
      setCurricula((current) => append ? [...current, ...data.curricula] : data.curricula);
      setHasMore(data.hasMore);
      setPage(nextPage);
      setAppliedQuery(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar currículos.');
    } finally {
      setLoading(false);
    }
  }, []);

  // This effect fetches the external API on mount; searches use the same loader.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(1, ''); }, [load]);

  function search(event: FormEvent) {
    event.preventDefault();
    void load(1, query.trim());
  }

  return (
    <section className="space-y-4" aria-labelledby="director-curricula-title">
      <div>
        <h2 id="director-curricula-title" className="flex items-center gap-2 text-lg font-bold text-white"><FileText className="h-5 w-5 text-amber-300" />Banco de currículos</h2>
        <p className="mt-1 text-sm text-slate-400">Acesso exclusivo à direção. Os downloads são registrados no histórico.</p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={search}>
        <label className="sr-only" htmlFor="curriculum-search">Buscar aluno, matrícula, turma ou curso</label>
        <input id="curriculum-search" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, matrícula, turma ou curso" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        <button className={button} disabled={loading}><Search className="h-4 w-4" />Buscar</button>
      </form>
      {error && <p role="alert" className="text-sm text-rose-300">{error} <button className="underline" onClick={() => void load(1, appliedQuery)}>Tentar novamente</button></p>}
      {loading && curricula.length === 0 ? <p role="status" className="text-sm text-slate-400">Carregando currículos…</p> : curricula.length ? (
        <div className="space-y-3">
          {curricula.map((item) => (
            <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-white">{item.student.name}</h3>
                <p className="break-all text-xs text-slate-400">{item.student.email}{item.student.registrationNumber ? ` • Matrícula ${item.student.registrationNumber}` : ''}</p>
                <p className="mt-1 text-xs text-slate-400">{[item.student.courseName, item.student.className].filter(Boolean).join(' • ') || 'Sem turma ativa'}</p>
                <p className="mt-2 break-all text-xs text-slate-300">{item.fileName} • {(item.sizeBytes / (1024 * 1024)).toFixed(item.sizeBytes < 1024 * 1024 ? 2 : 1)} MB • Atualizado em {new Date(item.updatedAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <a className={button} href={`/api/director/curriculums/${encodeURIComponent(item.id)}`}><Download className="h-4 w-4" />Baixar PDF</a>
            </article>
          ))}
          {hasMore && <button className={button} disabled={loading} onClick={() => void load(page + 1, appliedQuery, true)}>{loading ? 'Carregando…' : 'Carregar mais'}</button>}
        </div>
      ) : !loading ? <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">{appliedQuery ? 'Nenhum currículo encontrado para essa busca.' : 'Nenhum aluno enviou currículo ainda.'}</p> : null}
    </section>
  );
}
