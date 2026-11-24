'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/game';
import { playSound } from '@/components/ui/game/sound-store';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';

interface LoginFormProps {
  onSuccess: (user: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 'escolha' = tela "Escolha seu login"; depois do botão Entrar vem o formulário do perfil escolhido.
  const [step, setStep] = useState<'escolha' | 'form'>('escolha');
  const [who, setWho] = useState<'ALUNO' | 'PROFESSOR'>('ALUNO');

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

  if (step === 'escolha') {
    return (
      <div className="login-tema mx-auto w-full max-w-md font-[family-name:var(--font-game-body)] text-game-ink" data-testid="login-escolha">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-biblia3d-branca.png" alt="Bíblia 3D" className="h-20 w-auto" draggable={false} />
        </div>
        <div className="rounded-game-lg border-2 border-game-line bg-game-surface p-5 text-center shadow-2xl">
          <h1 className="mb-4 font-[family-name:var(--font-game-title)] text-2xl uppercase tracking-wide">Escolha seu login:</h1>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Escolha seu login">
            {([['ALUNO', 'Aluno', '/jornada/login-aluno.png'], ['PROFESSOR', 'Professor', '/jornada/login-professor.png']] as const).map(([id, label, img]) => (
              <button key={id} type="button" role="radio" aria-checked={who === id} data-testid={`login-${id.toLowerCase()}`}
                onClick={() => { playSound('tap'); setWho(id); }}
                className={`game-btn game-press flex flex-col items-center gap-2 rounded-game-lg border-2 p-3 ${who === id ? 'border-game-success bg-game-bg shadow-[0_0_18px_rgb(95_220_114/0.55)]' : 'border-game-line bg-game-surface-2'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" draggable={false} className="h-28 w-auto object-contain" />
                <span className="font-[family-name:var(--font-game-title)] text-xl uppercase tracking-wide">{label}</span>
              </button>
            ))}
          </div>
          <Button size="lg" className="mt-5 w-full" onClick={() => setStep('form')} data-testid="login-continuar">Entrar</Button>
        </div>
        <div className="mt-4 flex justify-center"><PWAInstallButton /></div>
      </div>
    );
  }

  const field = 'min-h-14 w-full rounded-game border-2 border-game-line bg-game-bg px-4 text-lg text-game-ink placeholder:text-game-ink-dim focus:border-game-primary focus:outline-none';
  return (
    <div className="login-tema mx-auto w-full max-w-md font-[family-name:var(--font-game-body)] text-game-ink" data-testid="login-screen">
      <div className="mb-5 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-biblia3d-branca.png" alt="Bíblia 3D" className="h-20 w-auto" draggable={false} />
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
          <label htmlFor="login-email" className="block font-semibold">{who === 'ALUNO' ? 'Seu usuário' : 'Seu e-mail'}
            <input id="login-email" type="text" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={who === 'ALUNO' ? 'Login (8 números, sem o 81)' : 'Seu e-mail'} className={`${field} mt-1`} />
          </label>
          <label htmlFor="login-password" className="block font-semibold">Senha
            <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha" className={`${field} mt-1`} />
          </label>
          <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? 'Entrando…' : 'Entrar'}</Button>
          <Button variant="ghost" className="w-full" onClick={() => { setStep('escolha'); setError(null); setChoices(null); }}>Voltar</Button>
        </form>
      </div>
      <div className="mt-4 flex justify-center"><PWAInstallButton /></div>
    </div>
  );
};
