'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';

type Curriculum = { id: string; fileName: string; sizeBytes: number; updatedAt: string };
const panel = 'rounded-2xl border border-slate-800 bg-slate-900/70 p-4';
const button = 'inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50';

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

export function StudentCurriculum() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/student/curriculum', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar seu currículo.');
      setCurriculum(data.curriculum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar seu currículo.');
    } finally {
      setLoading(false);
    }
  }

  // This effect fetches the external API on mount; subsequent updates use the same loader.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError('Selecione um arquivo PDF.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/student/curriculum', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível enviar o currículo.');
      setCurriculum(data.curriculum);
      setNotice('Currículo salvo. Somente a direção pode consultá-lo.');
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar o currículo.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Remover seu currículo? A direção deixará de consultá-lo.')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/student/curriculum', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível remover o currículo.');
      setCurriculum(null);
      setNotice('Currículo removido.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível remover o currículo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${panel} space-y-4`} aria-labelledby="student-curriculum-title">
      <div>
        <h2 id="student-curriculum-title" className="flex items-center gap-2 text-lg font-bold text-white"><FileText className="h-5 w-5 text-amber-300" />Meu currículo</h2>
        <p className="mt-1 text-sm text-slate-400">Envie um PDF de até 5 MB. O arquivo fica privado e somente a direção pode consultá-lo.</p>
      </div>
      {error && <p role="alert" className="text-sm text-rose-300">{error} <button className="underline" onClick={() => void load()}>Tentar novamente</button></p>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      {loading ? <p role="status" className="text-sm text-slate-400">Carregando currículo…</p> : curriculum ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="min-w-0">
            <p className="break-all text-sm font-semibold text-slate-100">{curriculum.fileName}</p>
            <p className="mt-1 text-xs text-slate-400">{formatSize(curriculum.sizeBytes)} • Atualizado em {new Date(curriculum.updatedAt).toLocaleDateString('pt-BR')}</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" />Remover</button>
        </div>
      ) : <p className="text-sm text-slate-400">Você ainda não enviou um currículo.</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm text-slate-300">
          {curriculum ? 'Escolha um novo PDF para substituir o atual' : 'Arquivo PDF'}
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" disabled={loading || busy} className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100" />
        </label>
        <button type="button" className={button} disabled={loading || busy} onClick={() => void upload()}><Upload className="h-4 w-4" />{busy ? 'Enviando…' : curriculum ? 'Substituir currículo' : 'Enviar currículo'}</button>
      </div>
    </section>
  );
}
