'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { WardrobeScreen } from './shell/WardrobeScreen';
import { useUserPreferences } from '@/components/layout/UserPreferences';
import { LevelEffect } from './themes/LevelEffect';
import { ThemeApplier } from './themes/ThemeApplier';
import { ThemeBackdrop } from './themes/ThemeBackdrop';
import { hasScene } from './themes/scenes';
import { ThemesScreen } from './themes/ThemesScreen';
import {
  Button, Card, CheckIcon, CoinIcon, GamepadIcon, GavelIcon, HUD, HomeIcon, LiveMascot, MoreIcon, MascotLookProvider, RewardPop, RewardSummary, SoundToggle, StarIcon, TrophyIcon, TabBar, TargetIcon, useGameSound,
} from '@/components/ui/game';
import { levelProgress } from '@/lib/level';
import type { PanelTarget } from '@/lib/panel-navigation';
import { attitudeRewardSummary, shouldShowSummary, type RewardSummaryData } from '@/lib/reward-summary';
import { GamesScreen } from './games/GamesScreen';
import { DaviTutor } from './guide/DaviGuide';
import { kidsCall } from './kids-api';
import { useKidsHome, type PointsGain } from './useKidsHome';
import { AuctionScreen } from './shell/AuctionScreen';
import { HomeScreen } from './shell/HomeScreen';
import { MyDataSheet } from './shell/MyDataSheet';
import { SideNav } from './shell/SideNav';
import { LiveQuizScreen } from './live/LiveQuizScreen';
import { NoticesDialog, useUnreadNotices } from './shell/NoticesDialog';
import { ProfileScreen } from './shell/ProfileScreen';
import { ChallengeScreen } from './shell/ChallengeScreen';
import { DayScreen } from './shell/DayScreen';
import { LearnedScreen } from './shell/LearnedScreen';
import { EventsScreen } from './shell/EventsScreen';
import { RankingScreen } from './shell/RankingScreen';
import { parentTab, viewFromPanelTarget, type View } from './shell/views';

const TABS = [
  { id: 'home', label: 'Início', icon: <HomeIcon /> },
  { id: 'quests', label: 'Desafios', icon: <TargetIcon /> },
  { id: 'auction', label: 'Leilão', icon: <GavelIcon /> },
  { id: 'games', label: 'Jogos', icon: <GamepadIcon /> },
];

const ICONS = { star: <StarIcon />, coin: <CoinIcon />, check: <CheckIcon />, trophy: <TrophyIcon /> };

export const StudentView: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [view, setView] = useState<View>('home');
  const [reward, setReward] = useState<{ id: number; amount: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeVersion, setNoticeVersion] = useState(0);
  const unread = useUnreadNotices(noticeVersion);
  const { play } = useGameSound();
  const { preferences } = useUserPreferences();
  const prefsRef = useRef(preferences);
  useEffect(() => { prefsRef.current = preferences; }, [preferences]);
  const [burst, setBurst] = useState(0);
  const [summary, setSummary] = useState<(RewardSummaryData & { levelUp: number | null; seenUpTo?: string }) | null>(null);
  const summaryOpen = useRef(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onGain = useCallback((gain: PointsGain) => {
    if (summaryOpen.current) {
      // a Tela de Resultado já está aberta: ela mostra o nível novo e toca o som; sem RewardPop duplicado
      if (gain.leveledUp) { setSummary((s) => (s ? { ...s, levelUp: gain.level } : s)); setBurst((b) => b + 1); }
      return;
    }
    setReward({ id: gain.id, amount: gain.amount });
    setCelebrate(true);
    if (gain.leveledUp) {
      setBurst((b) => b + 1);
      const chosen = prefsRef.current.achievementSound;
      play(chosen === 'sino' ? 'sino' : chosen === 'fanfarra' ? 'fanfarra' : 'levelUp');
    } else play('coin');
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrate(false), 2400);
  }, [play]);
  const onReward = useCallback((s: RewardSummaryData) => {
    if (!shouldShowSummary(s.items.length, false)) return; // ganho simples continua no RewardPop
    summaryOpen.current = true;
    setSummary({ ...s, levelUp: null });
  }, []);
  const closeSummary = useCallback(() => {
    summaryOpen.current = false;
    setSummary((s) => {
      if (s?.seenUpTo) void kidsCall('/api/kids/attitudes', 'POST', { upTo: s.seenUpTo }).catch(() => {}); // marca como visto no servidor
      return null;
    });
  }, []);

  // Ganhos por atitude recebidos enquanto o aluno estava fora: mostra a Tela de Resultado ao entrar.
  useEffect(() => {
    let alive = true;
    kidsCall('/api/kids/attitudes').then((r: { count: number; xp: number; coins: number; upTo: string | null }) => {
      const s = alive && r.upTo ? attitudeRewardSummary(r) : null;
      if (s && !summaryOpen.current) { summaryOpen.current = true; setSummary({ ...s, levelUp: null, seenUpTo: r.upTo as string }); }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => () => { if (celebrateTimer.current) clearTimeout(celebrateTimer.current); }, []);

  const { home, error: loadError, reload } = useKidsHome(onGain);

  // Evento global panel:navigate com detail.target (avisos e atalhos).
  useEffect(() => {
    function onNavigate(event: Event) {
      const detail = (event as CustomEvent<PanelTarget>).detail;
      setView(viewFromPanelTarget(detail.target));
    }
    window.addEventListener('panel:navigate', onNavigate);
    return () => window.removeEventListener('panel:navigate', onNavigate);
  }, []);

  const go = useCallback((next: View) => { setView(next); setNotice(''); setError(''); window.scrollTo?.({ top: 0 }); }, []);

  let screen: React.ReactNode = null;
  if (!home) {
    screen = (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <LiveMascot size={8} />
        {loadError ? (
          <Card as="div" tone="default" role="alert"><p className="font-semibold">{loadError}</p></Card>
        ) : (
          <p role="status" className="text-lg text-game-ink-dim">Carregando…</p>
        )}
      </div>
    );
  } else if (view === 'home') {
    screen = <HomeScreen home={home} celebrate={celebrate} onGo={go}
      onNotice={setNotice} onError={setError} onRefresh={reload} />;
  } else if (view === 'quests') {
    screen = <ChallengeScreen home={home} onError={setError} onRefresh={reload} onReward={onReward} />;
  } else if (view === 'day') {
    screen = <DayScreen home={home} onGo={go} onNotice={setNotice} onError={setError} onRefresh={reload} />;
  } else if (view === 'learned') {
    screen = <LearnedScreen home={home} onNotice={setNotice} onError={setError} onRefresh={reload} />;
  } else if (view === 'auction') {
    screen = <AuctionScreen home={home} onRefresh={reload} />;
  } else if (view === 'live') {
    screen = <LiveQuizScreen onBack={() => go('home')} />;
  } else if (view === 'games') {
    screen = <GamesScreen />;
  } else if (view === 'events') {
    screen = <EventsScreen />;
  } else if (view === 'ranking') {
    screen = <RankingScreen home={home} />;
  } else if (view === 'themes') {
    screen = <ThemesScreen home={home} onBack={() => go('profile')} onPreviewEffect={() => setBurst((b) => b + 1)} />;
  } else if (view === 'wardrobe') {
    screen = <WardrobeScreen onBack={() => go('profile')} onSaved={reload} />;
  } else if (view === 'profile') {
    screen = <ProfileScreen home={home} onGo={go} onLogout={onLogout} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <MascotLookProvider value={home?.mascotLook ?? {}}>
      <div className={`min-h-screen pb-28 font-[family-name:var(--font-game-body)] text-lg text-game-ink ${hasScene(preferences.theme) ? 'relative z-10' : 'bg-game-bg'}`} data-testid="student-shell">
        <ThemeBackdrop themeId={preferences.theme} look={home?.mascotLook ?? {}} />
        <ThemeApplier themeId={preferences.theme} look={home?.mascotLook ?? {}} />
        <LevelEffect effect={preferences.levelEffect} burst={burst} />
        <HUD wide className="lg:pl-64" coins={home?.coins.available ?? 0} points={home?.points ?? 0} actions={<>
          <SoundToggle className="size-10!" />
          {home && (
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Meus dados e mais" data-testid="home-menu" className="relative size-10!">
              <MoreIcon />
              {unread ? <span className="absolute -right-1 -top-1 size-4 rounded-full bg-game-danger" aria-hidden /> : null}
            </Button>
          )}
        </>}
          onProfile={home ? () => go('profile') : undefined} profileActive={parentTab(view) === 'profile'} />
        <RewardPop reward={reward} onDone={() => setReward(null)} />
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:ml-64 lg:max-w-none lg:px-8 lg:py-6"><div className={`mx-auto w-full space-y-4 ${view === 'home' || view === 'games' || view === 'auction' ? 'max-w-7xl' : 'max-w-4xl'}`}>
          {error && <div role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</div>}
          {notice && <div role="status" className="rounded-game border-2 border-game-success bg-game-surface p-3 font-semibold">{notice}</div>}
          {screen}
        </div></main>
        <SideNav active={view === 'day' || view === 'learned' || view === 'wardrobe' || view === 'themes' ? parentTab(view) : view} onChange={go} unread={unread} onNotices={() => setNoticesOpen(true)} onLogout={onLogout} />
        <TabBar className="lg:hidden" items={TABS} activeId={parentTab(view)} onChange={(id) => go(id as View)} />
        {summary && (
          <RewardSummary title={summary.title} subtitle={summary.subtitle} xp={summary.xp} totalCoins={summary.totalCoins}
            items={summary.items.map((it) => ({ ...it, icon: ICONS[it.icon] }))} levelUp={summary.levelUp}
            tutorSlot={summary.tutor ? <DaviTutor text={summary.tutor.text} mood={summary.tutor.mood} /> : undefined}
            progress={home ? (() => { const p = levelProgress(home.points); return { value: p.xpIntoLevel, max: p.xpForLevel }; })() : undefined}
            onContinue={closeSummary} />
        )}
        {menuOpen && home && <MyDataSheet home={home} unread={unread} onGo={go} onOpenNotices={() => setNoticesOpen(true)} onLogout={onLogout} onClose={() => setMenuOpen(false)} />}
        {noticesOpen && <NoticesDialog onClose={() => setNoticesOpen(false)} onRead={() => setNoticeVersion((v) => v + 1)} />}
      </div>
      </MascotLookProvider>
    </MotionConfig>
  );
};
