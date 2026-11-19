'use client';
import { useCallback, useEffect, useState } from 'react';

export interface TestAccountItem { login: string; password: string; name: string; role: 'DIRETOR' | 'PROFESSOR' | 'ALUNO'; note: string }

const roleLabel = { DIRETOR: 'Diretor', PROFESSOR: 'Professor', ALUNO: 'Aluno' } as const;
const groups: ('DIRETOR' | 'PROFESSOR' | 'ALUNO')[] = ['DIRETOR', 'PROFESSOR', 'ALUNO'];

/** Lê as contas de teste; `null` = modo demonstração desligado (a barra nem aparece). */
export function useTestAccounts() {
  const [accounts, setAccounts] = useState<TestAccountItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/test-accounts').then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d?.accounts) setAccounts(d.accounts); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return accounts;
}

export function TestAccountsPanel({ accounts, currentLogin, onSwitch, onOpenTour }: {
  accounts: TestAccountItem[];
  currentLogin?: string | null;
  onSwitch: (user: any) => void;
  onOpenTour: () => void;
}) {
  // Aberta por padrão só em telas largas; no celular ela cobriria o formulário.
  const [open, setOpen] = useState(() => window.innerWidth >= 900 && !currentLogin);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const enter = useCallback(async (a: TestAccountItem) => {
    setError(null); setBusy(a.login);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: a.login, password: a.password }) });
      const data = await res.json();
      if (!res.ok || !data.user) throw new Error(data.error || 'Não foi possível entrar.');
      onSwitch(data.user);
      if (window.innerWidth < 900) setOpen(false);
    } catch (e: any) { setError(e.message || 'Falha ao entrar.'); } finally { setBusy(null); }
  }, [onSwitch]);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1200); } catch { /* sem permissão de área de transferência */ }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="test-accounts-panel"
        className="fixed left-0 top-1/2 z-[60] -translate-y-1/2 rounded-r-xl border border-l-0 border-amber-500/60 bg-amber-500 px-2 py-3 text-xs font-black text-slate-950 shadow-lg [writing-mode:vertical-rl]">
        {open ? 'Fechar' : 'Contas de teste'}
      </button>
      {open && <aside id="test-accounts-panel" aria-label="Contas de teste" className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col border-r border-slate-700 bg-slate-950/98 pl-8 text-slate-100 shadow-2xl backdrop-blur">
        <div className="space-y-2 border-b border-slate-800 py-4 pr-4">
          <h2 className="text-base font-black text-amber-300">Contas de teste</h2>
          <p className="text-xs leading-relaxed text-slate-400">Ambiente de demonstração. Toque em uma conta para entrar já com ela, sem digitar nada.</p>
          <button type="button" onClick={onOpenTour} className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-amber-500">Ver o tour do painel</button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto py-3 pr-4">
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">{error}</p>}
          {groups.map((g) => {
            const list = accounts.filter((a) => a.role === g);
            if (!list.length) return null;
            return <section key={g}>
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{roleLabel[g]}{list.length > 1 ? 's' : ''}</h3>
              <ul className="space-y-2">
                {list.map((a) => <li key={a.login} className={`rounded-xl border p-2.5 ${currentLogin === a.login ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
                  <p className="text-sm font-bold">{a.name}</p>
                  <p className="text-[11px] text-slate-400">{a.note}</p>
                  <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 text-[11px]">
                    <dt className="text-slate-500">Usuário</dt><dd><button type="button" onClick={() => copy(a.login, a.login + 'u')} className="font-mono text-slate-200 hover:text-amber-300">{a.login}{copied === a.login + 'u' ? ' ✓' : ''}</button></dd>
                    <dt className="text-slate-500">Senha</dt><dd><button type="button" onClick={() => copy(a.password, a.login + 'p')} className="font-mono text-slate-200 hover:text-amber-300">{a.password}{copied === a.login + 'p' ? ' ✓' : ''}</button></dd>
                  </dl>
                  <button type="button" disabled={busy !== null} onClick={() => enter(a)} className="mt-2 w-full rounded-lg bg-amber-500 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50">
                    {busy === a.login ? 'Entrando…' : currentLogin === a.login ? 'Conta atual' : 'Entrar com esta conta'}
                  </button>
                </li>)}
              </ul>
            </section>;
          })}
        </div>
      </aside>}
    </>
  );
}
