'use client';

import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { LoginForm } from '@/components/auth/LoginForm';
import { StudentView } from '@/components/student/StudentView';
import { FirstPasswordScreen } from '@/components/auth/FirstPasswordScreen';
import { AccessPendingScreen } from '@/components/auth/AccessPendingScreen';
import { TeacherView } from '@/components/teacher/TeacherView';
import { DirectorView } from '@/components/director/DirectorView';
import { UserPreferences } from '@/components/layout/UserPreferences';
import { OnboardingTour, TOUR_EVENT, type TourRole } from '@/components/onboarding/OnboardingTour';
import { TestAccountsPanel, useTestAccounts } from '@/components/onboarding/TestAccountsPanel';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const testAccounts = useTestAccounts();

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          setUser(data?.user || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
    }
  };

  const handleLoginSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a12]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Carregando Bíblia 3D...</span>
        </div>
      </div>
    );
  }

  // Aluno ou professor com a senha padrão só enxerga a tela de criar a senha nova (o servidor bloqueia o resto).
  if ((user?.role === 'ALUNO' || user?.role === 'PROFESSOR') && user.mustChangePassword) {
    return <FirstPasswordScreen onDone={() => setUser({ ...user, mustChangePassword: false })} onLogout={handleLogout} />;
  }

  // Cadastro novo: a criança preenche os próprios dados e espera a equipe liberar o acesso.
  if (user?.role === 'ALUNO' && user.accessPending) {
    return <AccessPendingScreen profileCompleted={user.profileCompleted === true} onProfileSaved={() => setUser({ ...user, profileCompleted: true })}
      onReleased={() => setUser({ ...user, accessPending: false })} onLogout={handleLogout} />;
  }

  const tourRole: TourRole = user?.role === 'ALUNO' || user?.role === 'PROFESSOR' || user?.role === 'DIRETOR' ? user.role : 'VISITANTE';
  const extras = (
    <>
      {/* O tour de visitante manda usar as contas de teste: só aparece quando esse painel está ligado (senão cobre a tela de login à toa). */}
      {(tourRole !== 'VISITANTE' || testAccounts) && <OnboardingTour key={`${tourRole}:${user?.id ?? ''}`} role={tourRole} userId={user?.id} />}
      {testAccounts && <TestAccountsPanel accounts={testAccounts} currentLogin={user?.email} onSwitch={handleLoginSuccess} onOpenTour={() => window.dispatchEvent(new Event(TOUR_EVENT))} />}
    </>
  );

  const content = (
    <div className="min-h-dvh bg-[#070a12] flex flex-col text-slate-100 selection:bg-amber-500/20 selection:text-amber-300">
      {/* Brand Header with PWA installation & profile info */}
      {user && user.role !== 'ALUNO' && <AppHeader user={user} onLogout={handleLogout} />}

      {/* Main Dynamic Content based on User Role */}
      <main className={user?.role === 'ALUNO' ? 'flex-1' : 'flex-1 pb-16'}>
        {!user ? (
          <div className="flex min-h-[calc(100vh-8rem)] flex-col justify-center px-4 py-8">
            <LoginForm onSuccess={handleLoginSuccess} />
          </div>
        ) : user.role === 'ALUNO' ? (
          <StudentView onLogout={handleLogout} />
        ) : user.role === 'PROFESSOR' ? (
          <TeacherView />
        ) : user.role === 'DIRETOR' ? (
          <DirectorView />
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            Perfil de usuário não identificado.
          </div>
        )}
      </main>

      {extras}

      {/* Footer */}
      {user && user.role !== 'ALUNO' && <footer className="border-t border-slate-900/80 bg-[#05070d] py-5 text-center text-[11px] text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Bíblia 3D</span>
            <span>&bull;</span>
            <span>Painel do Aluno &amp; Gestão Acadêmica</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <span>PWA Instalável</span>
            <span>&bull;</span>
            <span>Prisma ORM</span>
            <span>&bull;</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </footer>}
    </div>
  );
  return user ? <UserPreferences key={user.id}>{content}</UserPreferences> : content;
}
