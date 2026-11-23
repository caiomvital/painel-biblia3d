'use client';

import React, { useState } from 'react';
import { Button, Mascot } from '@/components/ui/game';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';

interface LoginFormProps {
  onSuccess: (user: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [choices, setChoices] = useState<{ id: string; name: string }[] | null>(null);

  const handleSubmit = async (e: React.FormEvent, studentUserId?: string) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, studentUserId }),
      });

      const data = await res.json();
      if (data.choose) { setChoices(data.choose); return; }
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const field = 'min-h-14 w-full rounded-game border-2 border-game-line bg-game-bg px-4 text-lg text-game-ink placeholder:text-game-ink-dim focus:border-game-primary focus:outline-none';
  return (
    <div className="mx-auto w-full max-w-md font-[family-name:var(--font-game-body)] text-game-ink" data-testid="login-screen">
      <div className="mb-5 flex flex-col items-center gap-3">
        <Mascot size={6} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-biblia3d-branca.png" alt="Bíblia 3D" className="h-14 w-auto" draggable={false} />
      </div>
      <div className="rounded-game-lg border-2 border-game-line bg-game-surface p-5 shadow-2xl">
        {error && (
          <p role="alert" className="mb-4 rounded-game border-2 border-game-danger bg-game-bg p-3 font-semibold">{error}</p>
        )}

        {choices && (
          <div className="mb-5 rounded-game border-2 border-game-primary bg-game-bg p-4">
            <p className="mb-3 text-center text-lg font-bold">Quem vai entrar agora?</p>
            <div className="grid gap-2">
              {choices.map((c) => (
                <Button key={c.id} size="lg" onClick={(ev) => handleSubmit(ev as unknown as React.FormEvent, c.id)}>{c.name}</Button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="login-email" className="block font-semibold">Usuário ou e-mail
            <input id="login-email" type="text" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Escreva aqui" className={`${field} mt-1`} />
          </label>
          <label htmlFor="login-password" className="block font-semibold">Senha
            <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha" className={`${field} mt-1`} />
          </label>
          <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? 'Entrando…' : 'Entrar'}</Button>
        </form>
      </div>
      <div className="mt-4 flex justify-center"><PWAInstallButton /></div>
    </div>
  );
};
