'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  Card, GamepadIcon, GavelIcon, HUD, HomeIcon, LiveMascot, RewardPop, SoundToggle, TabBar, TargetIcon, UserIcon, useGameSound,
} from '@/components/ui/game';
import type { PanelTarget } from '@/lib/panel-navigation';
import { GamesScreen } from './games/GamesScreen';
import { useKidsHome, type PointsGain } from './useKidsHome';
import type { StudentTab } from './student-types';
import { AuctionScreen } from './shell/AuctionScreen';
import { HomeScreen } from './shell/HomeScreen';
import { LegacyArea, type LegacyView } from './shell/LegacyArea';
import { NoticesDialog, useUnreadNotices } from './shell/NoticesDialog';
import { ProfileScreen } from './shell/ProfileScreen';
import { QuestsScreen } from './shell/QuestsScreen';
import { RankingScreen } from './shell/RankingScreen';
import { parentTab, viewFromLegacyTab, viewFromPanelTarget, type View } from './shell/views';

const TABS = [
  { id: 'home', label: 'Início', icon: <HomeIcon /> },
  { id: 'quests', label: 'Desafios', icon: <TargetIcon /> },
  { id: 'auction', label: 'Leilão', icon: <GavelIcon /> },
  { id: 'games', label: 'Jogos', icon: <GamepadIcon /> },
  { id: 'profile', label: 'Perfil', icon: <UserIcon /> },
];

export const StudentView: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [view, setView] = useState<View>('home');
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [reward, setReward] = useState<{ id: number; amount: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [noticeVersion, setNoticeVersion] = useState(0);
  const unread = useUnreadNotices(noticeVersion);
  const { play } = useGameSound();
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onGain = useCallback((gain: PointsGain) => {
    setReward({ id: gain.id, amount: gain.amount });
    setCelebrate(true);
    play(gain.leveledUp ? 'levelUp' : 'coin');
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrate(false), 2400);
  }, [play]);
  useEffect(() => () => { if (celebrateTimer.current) clearTimeout(celebrateTimer.current); }, []);

  const { home, error: loadError, reload } = useKidsHome(onGain);

  // Contrato antigo preservado: evento global panel:navigate com detail.target (e id da aula).
  useEffect(() => {
    function onNavigate(event: Event) {
      const detail = (event as CustomEvent<PanelTarget>).detail;
      setView(viewFromPanelTarget(detail.target));
      if (detail.target === 'lessons' && detail.id) setExpandedLessonId(detail.id);
    }
    window.addEventListener('panel:navigate', onNavigate);
    return () => window.removeEventListener('panel:navigate', onNavigate);
  }, []);

  const go = useCallback((next: View) => { setView(next); setNotice(''); setError(''); window.scrollTo?.({ top: 0 }); }, []);
  const goLegacyTab = useCallback((tab: StudentTab) => go(viewFromLegacyTab(tab)), [go]);

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
    screen = <HomeScreen home={home} celebrate={celebrate} unread={unread} onGo={go} onOpenNotices={() => setNoticesOpen(true)}
      onNotice={setNotice} onError={setError} onRefresh={reload} />;
  } else if (view === 'quests') {
    screen = <QuestsScreen home={home} onNotice={setNotice} onError={setError} onRefresh={reload} />;
  } else if (view === 'auction') {
    screen = <AuctionScreen home={home} onRefresh={reload} />;
  } else if (view === 'games') {
    screen = <GamesScreen />;
  } else if (view === 'ranking') {
    screen = <RankingScreen home={home} />;
  } else if (view === 'profile') {
    screen = <ProfileScreen home={home} onGo={go} onLogout={onLogout} />;
  } else {
    const legacy = view as LegacyView;
    screen = <LegacyArea view={legacy} expandedLessonId={expandedLessonId} onExpandLesson={setExpandedLessonId}
      onGo={goLegacyTab} onBack={() => go(legacy === 'badges' ? 'home' : 'profile')} coinsAvailable={home.coins.available} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-game-bg pb-28 font-[family-name:var(--font-game-body)] text-lg text-game-ink" data-testid="student-shell">
        <HUD coins={home?.coins.available ?? 0} points={home?.points ?? 0} actions={<SoundToggle />} />
        <RewardPop reward={reward} onDone={() => setReward(null)} />
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
          {error && <div role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</div>}
          {notice && <div role="status" className="rounded-game border-2 border-game-success bg-game-surface p-3 font-semibold">{notice}</div>}
          {screen}
        </main>
        <TabBar items={TABS} activeId={parentTab(view)} onChange={(id) => go(id as View)} />
        {noticesOpen && <NoticesDialog onClose={() => setNoticesOpen(false)} onRead={() => setNoticeVersion((v) => v + 1)} />}
      </div>
    </MotionConfig>
  );
};
