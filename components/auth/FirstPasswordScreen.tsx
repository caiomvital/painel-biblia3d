'use client';

import React, { useState } from 'react';
import { Button, Card, Mascot } from '@/components/ui/game';
import { firstPasswordProblem } from '@/lib/password-rules';

const field = 'mt-1 w-full rounded-game border-2 border-game-line bg-game-bg px-4 py-3 text-lg font-normal text-game-ink';

/**
 * "Crie sua senha nova": única tela que o aluno vê enquanto está com a senha padrão.
 * (O servidor também bloqueia todo o resto; esta tela só deixa o caminho claro para a criança.)
 */
export function FirstPasswordScreen({ onDone, onLogout }: { onDone: () => void; onLogout: () => void }) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const local = firstPasswordProblem(password);
    if (local) return setError(local);
    if (password !== again) return setError('As duas senhas são diferentes. Tente de novo!');
    setBusy(true);
    try {
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FIRST_PASSWORD', newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === 'string' && response.status < 500 ? data.error : 'Não deu certo agora. Tente de novo!');
        return;
      }
      onDone();
    } catch {
      setError('Sem internet? Tente de novo!');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-game-bg px-4 py-8 font-[family-name:var(--font-game-body)] text-lg text-game-ink" data-testid="first-password-screen">
      <main className="mx-auto flex max-w-md flex-col items-center gap-4">
        <Mascot size={7.5} />
        <h1 className="text-center font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Crie sua senha nova</h1>
        <p className="text-center text-game-ink-dim">Só você vai saber. Use 5 letras ou números.</p>
        <Card as="div" tone="highlight" className="w-full">
          <form className="space-y-4" onSubmit={submit} noValidate>
            <label className="block font-semibold">Senha nova
              <input name="newPassword" type={show ? 'text' : 'password'} autoComplete="new-password" className={`${field} min-h-12`}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="block font-semibold">Escreva de novo
              <input name="again" type={show ? 'text' : 'password'} autoComplete="new-password" className={`${field} min-h-12`}
                value={again} onChange={(e) => setAgain(e.target.value)} />
            </label>
            <label className="flex min-h-12 items-center gap-3 font-semibold">
              <input type="checkbox" className="size-6" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Mostrar a senha
            </label>
            {error && <p role="alert" data-testid="first-password-error" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</p>}
            <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? 'Salvando…' : 'Salvar senha'}</Button>
          </form>
        </Card>
        <Button variant="ghost" onClick={onLogout}>Sair</Button>
      </main>
    </div>
  );
}
