'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card, Mascot } from '@/components/ui/game';

const field = 'mt-1 w-full rounded-game border-2 border-game-line bg-game-bg px-4 py-3 text-lg font-normal text-game-ink';

/**
 * Cadastro novo: 1) a criança preenche os próprios dados; 2) espera a equipe da Fuctura revisar e liberar o acesso.
 * (O servidor bloqueia todo o resto enquanto Student.accessPending estiver ligado.)
 */
export function AccessPendingScreen({ profileCompleted, onProfileSaved, onReleased, onLogout }: {
  profileCompleted: boolean; onProfileSaved: () => void; onReleased: () => void; onLogout: () => void;
}) {
  const [birth, setBirth] = useState('');
  const [guardian, setGuardian] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const r = await fetch('/api/kids/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birthDate: birth, guardianName: guardian }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(typeof data.error === 'string' ? data.error : 'Não deu certo agora. Tente de novo!'); return; }
      onProfileSaved();
    } catch { setError('Sem internet? Tente de novo!'); } finally { setBusy(false); }
  }

  async function check(silent = false) {
    if (!silent) setChecking(true);
    try {
      const r = await fetch('/api/auth/me');
      const data = r.ok ? await r.json() : null;
      if (data?.user && data.user.accessPending === false) onReleased();
    } catch { /* tenta de novo depois */ } finally { setChecking(false); }
  }

  // enquanto espera, confere sozinho de tempos em tempos
  useEffect(() => {
    if (!profileCompleted) return;
    const t = setInterval(() => { void check(true); }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileCompleted]);

  return (
    <div className="min-h-screen bg-game-bg px-4 py-8 font-[family-name:var(--font-game-body)] text-lg text-game-ink" data-testid="access-pending-screen">
      <main className="mx-auto flex max-w-md flex-col items-center gap-4">
        <Mascot size={7.5} />
        {!profileCompleted ? (
          <>
            <h1 className="text-center font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Complete seu cadastro</h1>
            <p className="text-center text-game-ink-dim">Preencha seus dados. A equipe da Fuctura confere e libera o seu acesso.</p>
            <Card as="div" tone="highlight" className="w-full">
              <form className="space-y-4" onSubmit={save}>
                <label className="block font-semibold">Data de nascimento
                  <input type="date" required value={birth} onChange={(e) => setBirth(e.target.value)} className={`${field} min-h-12`} />
                </label>
                <label className="block font-semibold">Nome do responsável
                  <input type="text" required minLength={2} maxLength={120} value={guardian} onChange={(e) => setGuardian(e.target.value)} className={`${field} min-h-12`} />
                </label>
                {error && <p role="alert" className="font-semibold text-game-danger">{error}</p>}
                <Button type="submit" size="lg" disabled={busy}>Enviar meus dados</Button>
              </form>
            </Card>
          </>
        ) : (
          <>
            <h1 className="text-center font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Quase lá!</h1>
            <Card as="div" tone="success" className="w-full text-center">
              <p className="font-semibold">Seus dados foram enviados.</p>
              <p className="mt-1 text-game-ink-dim">A equipe da Fuctura está conferindo. Quando liberar, você já pode jogar!</p>
              <Button className="mt-4" onClick={() => void check()} disabled={checking}>{checking ? 'Olhando…' : 'Já liberaram?'}</Button>
            </Card>
          </>
        )}
        <Button variant="ghost" onClick={onLogout}>Sair</Button>
      </main>
    </div>
  );
}
