'use client';

import { KidsHome } from '@/components/student/KidsHome';
import { GamesSection } from '@/components/student/GamesSection';
import React, { useState, useEffect } from 'react';
import { Flame, Zap, Trophy, Calendar, CheckCircle2, Award, Sparkles, FileText, Star, Compass, Gavel } from 'lucide-react';
import { AuctionSection, AuctionItem } from '@/components/auction/AuctionSection';
import { HeroAuctionFlashcard } from '@/components/auction/HeroAuctionFlashcard';
import { StudentCurriculum } from '@/components/student/StudentCurriculum';
import { StudentExercises } from '@/components/student/StudentExercises';
import { StudentOverview } from '@/components/student/StudentOverview';
import { StudentLessons } from '@/components/student/StudentLessons';
import { StudentBadges } from '@/components/student/StudentBadges';

export const StudentView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kids' | 'games' | 'overview' | 'auction' | 'lessons' | 'exercises' | 'ranking' | 'badges' | 'curriculum'>('kids');
  const [requestingAttendance, setRequestingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);
  const [attendanceErrorMsg, setAttendanceErrorMsg] = useState<string | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [studentBalance, setStudentBalance] = useState<number>(0);
  const [directBidItem, setDirectBidItem] = useState<AuctionItem | null>(null);
  useEffect(() => {
    function onNavigate(event: Event) {
      const detail = (event as CustomEvent<import('@/lib/panel-navigation').PanelTarget>).detail;
      setActiveTab(detail.target === 'auction' ? 'auction' : detail.target === 'lessons' || detail.target === 'attendance' ? 'lessons' : 'overview');
      if (detail.target === 'lessons' && detail.id) setExpandedLessonId(detail.id);
    }
    window.addEventListener('panel:navigate', onNavigate);
    return () => window.removeEventListener('panel:navigate', onNavigate);
  }, []);


  const handleOpenFlashcardBid = (item: AuctionItem) => {
    setActiveTab('auction');
    setDirectBidItem(item);
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/dashboard');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar painel do aluno.');
      setData(json);
      setStudentBalance(json.student?.availableCoins ?? json.student?.coinBalance ?? 0);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/student/dashboard', { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar painel do aluno.');
        return json;
      })
      .then((json) => {
        if (controller.signal.aborted) return;
        setData(json);
        setStudentBalance(json.student?.availableCoins ?? json.student?.coinBalance ?? 0);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const handleMarkAttendance = async (lessonId: string) => {
    setRequestingAttendance(true);
    setAttendanceSuccessMsg(null);
    setAttendanceErrorMsg(null);
    try {
      const res = await fetch('/api/student/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Erro ao marcar presença.');
      }
      setAttendanceSuccessMsg('Sua presença foi registrada como PENDENTE. O professor validará em sala.');
      await fetchDashboard();
    } catch (err: any) {
      setAttendanceErrorMsg(err instanceof Error ? err.message : 'Não foi possível solicitar presença.');
    } finally {
      setRequestingAttendance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-slate-400">Carregando painel do aluno...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300">
          <p className="text-sm font-semibold">{error || 'Não foi possível carregar os dados.'}</p>
          <button
            onClick={fetchDashboard}
            className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const {
    student = {},
    course,
    classInfo,
    progress,
    lastLesson,
    nextLesson,
    missedLessons = [],
    ranking = [],
    badges = [],
    recentTransactions = [],
    lessons = [],
  } = data;

  const coinBalance = student.coinBalance ?? studentBalance ?? 0;
  const reservedCoins = student.reservedCoins ?? 0;
  const availableCoins = student.availableCoins ?? Math.max(0, coinBalance - reservedCoins);

  // Calculate XP needed for next level
  const currentLevelXpStart = (student.level - 1) * 300;
  const nextLevelXp = student.level * 300;
  const levelProgressXp = student.currentXp - currentLevelXpStart;
  const levelProgressPercent = Math.min(100, Math.round((levelProgressXp / 300) * 100));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* 1. Hero Greeting & Gamification Bar */}
      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-[#0c1427] p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-br from-amber-500/10 to-blue-600/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Portal do Aluno</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs text-slate-300 font-semibold">Bíblia 3D &bull; Estudo Bíblico em 3D</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-[11px] text-amber-400/80 font-mono">Recife - PE &bull; Espinheiro</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Olá, {student.name.split(' ')[0]}.
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2">
              <span className="text-amber-300 font-bold">{course?.name}</span>
              <span>&bull;</span>
              <span>Turma: <strong className="text-slate-200 font-normal">{classInfo?.name}</strong></span>
            </div>

            {/* Level XP Bar */}
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Nível {student.level}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {student.currentXp} / {nextLevelXp} XP ({levelProgressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800/90 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-blue-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Gamification Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
              {/* Streak */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:px-4 text-center backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Flame className="w-4 h-4 fill-amber-400 animate-bounce" />
                  <span className="font-mono text-lg sm:text-xl font-black">{student.streak}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">aulas seguidas</span>
              </div>

              {/* Total XP */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:px-4 text-center backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Zap className="w-4 h-4 fill-amber-400" />
                  <span className="font-mono text-lg sm:text-xl font-black">{student.currentXp.toLocaleString('pt-BR')}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">pontos XP</span>
              </div>

              {/* Saldo de Coins */}
              <button
                onClick={() => setActiveTab('auction')}
                className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/20 via-amber-950/30 to-slate-900/60 p-3 sm:px-4 text-center backdrop-blur-sm hover:border-amber-400 transition-all group relative overflow-hidden shadow-lg shadow-amber-500/10 cursor-pointer"
                title="Ver saldo e itens no leilão"
              >
                <div className="absolute top-1 right-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 group-hover:scale-105 transition-transform">
                  <Gavel className="w-4 h-4" />
                  <span className="font-mono text-lg sm:text-xl font-black">{availableCoins.toLocaleString('pt-BR')}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-300 mt-0.5 flex items-center gap-1">
                  Coins
                </span>
              </button>

              {/* Ranking */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:px-4 text-center backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Trophy className="w-4 h-4" />
                  <span className="font-mono text-lg sm:text-xl font-black">#{student.rankingPosition}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">na turma</span>
              </div>
            </div>
          </div>

          {/* Flashcard Interativo do Leilão - Lado Direito do Hero */}
          <div className="w-full lg:w-auto shrink-0 flex justify-center">
            <HeroAuctionFlashcard
              userBalance={availableCoins}
              onOpenBidItem={handleOpenFlashcardBid}
            />
          </div>
        </div>
      </div>

      {attendanceSuccessMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{attendanceSuccessMsg}</span>
        </div>
      )}
      {attendanceErrorMsg && <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{attendanceErrorMsg}</div>}

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('kids')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'kids' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span>⭐ Meu Painel</span>
        </button>

        <button
          onClick={() => setActiveTab('games')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'games' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span>🎮 Jogos</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={() => setActiveTab('auction')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'auction'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 font-black'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-200'
          }`}
        >
          <Gavel className="w-3.5 h-3.5 text-amber-400" />
          <span>Itens do Leilão 🔥</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
        </button>

        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'lessons'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Aulas &amp; Cronograma</span>
        </button>

        <button
          onClick={() => setActiveTab('exercises')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'exercises' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Exercícios</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'ranking'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Ranking da Turma</span>
        </button>

        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'badges'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Gamificação &amp; Medalhas ({badges.filter((b: any) => b.isEarned).length})</span>
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'curriculum'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Meu Currículo</span>
        </button>
      </div>

      {activeTab === 'kids' && <KidsHome />}
      {activeTab === 'games' && <GamesSection />}

      {/* TAB CONTENT 1: VISÃO GERAL (DASHBOARD RESUMIDO) */}
      {activeTab === 'overview' && (
        <StudentOverview
          data={data}
          studentBalance={studentBalance}
          requestingAttendance={requestingAttendance}
          onMarkAttendance={handleMarkAttendance}
          onGo={setActiveTab}
          onExpandLesson={setExpandedLessonId}
        />
      )}

      {/* TAB CONTENT: LEILÃO COMPLETO */}
      {activeTab === 'auction' && (
        <AuctionSection
          userRole="ALUNO"
          userName={student.name ? student.name.split(' ')[0] : 'Você'}
          userBalance={availableCoins}
          coinBalance={coinBalance}
          reservedCoins={reservedCoins}
          availableCoins={availableCoins}
          onBidSuccess={(b) => {
            setStudentBalance(b);
            fetchDashboard();
          }}
          externalOpenItem={directBidItem}
          onResetExternalOpenItem={() => setDirectBidItem(null)}
        />
      )}
      {activeTab === 'exercises' && <StudentExercises />}

      {/* TAB CONTENT 2: AULAS & CRONOGRAMA */}
      {activeTab === 'lessons' && <StudentLessons data={data} expandedLessonId={expandedLessonId} onExpandLesson={setExpandedLessonId} />}

      {/* TAB CONTENT 3: RANKING & GAMIFICAÇÃO */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Ranking da Turma ({classInfo?.name})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Classificação baseada exclusivamente no XP acadêmico acumulado em presenças e atividades.
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-xs text-slate-400">Sua posição:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm block">#{student.rankingPosition} Lugar</span>
            </div>
          </div>

          {/* Visual Podium for Top 3 */}
          <div className="grid grid-cols-3 gap-3 pt-6 pb-2 items-end max-w-xl mx-auto">
            {/* 2nd Place */}
            {ranking[1] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="h-12 w-12 rounded-full border-2 border-slate-300 bg-slate-800 flex items-center justify-center font-bold text-slate-200 text-sm">
                    {ranking[1].name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-900 text-[10px] font-black">
                    2
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-200 text-center line-clamp-1">{ranking[1].name}</span>
                <span className="text-[11px] font-mono text-amber-400 font-bold">{ranking[1].xp} XP</span>
                <div className="w-full h-20 bg-slate-800/80 rounded-t-2xl mt-2 border border-slate-700/50 flex items-center justify-center font-black text-slate-500 text-xl">
                  2º
                </div>
              </div>
            )}

            {/* 1st Place (Gold Podium) */}
            {ranking[0] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="h-16 w-16 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center font-black text-amber-300 text-base shadow-lg shadow-amber-500/20">
                    {ranking[0].name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md">
                    👑
                  </span>
                </div>
                <span className="text-xs font-bold text-white text-center line-clamp-1">{ranking[0].name}</span>
                <span className="text-xs font-mono text-amber-400 font-bold">{ranking[0].xp} XP</span>
                <div className="w-full h-28 bg-gradient-to-t from-amber-500/20 to-amber-500/10 rounded-t-2xl mt-2 border-t-2 border-amber-400 flex items-center justify-center font-black text-amber-400 text-2xl shadow-xl">
                  1º
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {ranking[2] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="h-12 w-12 rounded-full border-2 border-amber-700 bg-slate-800 flex items-center justify-center font-bold text-amber-600 text-sm">
                    {ranking[2].name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-white text-[10px] font-black">
                    3
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-200 text-center line-clamp-1">{ranking[2].name}</span>
                <span className="text-[11px] font-mono text-amber-400 font-bold">{ranking[2].xp} XP</span>
                <div className="w-full h-16 bg-slate-800/60 rounded-t-2xl mt-2 border border-slate-700/50 flex items-center justify-center font-black text-slate-500 text-xl">
                  3º
                </div>
              </div>
            )}
          </div>

          {/* Full ranking list */}
          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            {ranking.map((item: any) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-xl p-3 text-xs transition-colors ${
                  item.isCurrentUser
                    ? 'border-2 border-amber-500 bg-amber-500/10 font-bold text-white shadow-sm'
                    : 'border border-slate-800/60 bg-slate-950/40 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold w-6 text-center text-sm ${
                      item.position === 1
                        ? 'text-amber-400'
                        : item.position === 2
                        ? 'text-slate-300'
                        : item.position === 3
                        ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}
                  >
                    #{item.position}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">
                      {item.name} {item.isCurrentUser && <strong className="text-amber-400">(Você)</strong>}
                    </span>
                    <span className="text-[10px] text-slate-500">Matrícula ativa</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-amber-400 text-sm">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{item.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: GAMIFICAÇÃO & MEDALHAS */}
      {activeTab === 'badges' && <StudentBadges data={data} onGo={setActiveTab} />}

      {activeTab === 'curriculum' && <StudentCurriculum />}
    </div>
  );
};
