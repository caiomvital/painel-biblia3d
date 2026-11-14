'use client';

import React from 'react';
import { Flame, Zap, Trophy, Calendar, Clock, BookOpen, CheckCircle2, Clock3, Award, ChevronRight, Check, Gavel } from 'lucide-react';
import type { StudentTab } from './student-types';
import { formatDate } from './student-types';

export function StudentOverview({ data, studentBalance, requestingAttendance, onMarkAttendance, onGo, onExpandLesson }: { data: any; studentBalance: number; requestingAttendance: boolean; onMarkAttendance: (lessonId: string) => void; onGo: (tab: StudentTab) => void; onExpandLesson: (id: string) => void }) {
  const { student = {}, classInfo, lastLesson, nextLesson, lessons = [], badges = [] } = data;
  const coinBalance = student.coinBalance ?? studentBalance ?? 0;
  const reservedCoins = student.reservedCoins ?? 0;
  const availableCoins = student.availableCoins ?? Math.max(0, coinBalance - reservedCoins);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5" aria-labelledby="student-upcoming-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 id="student-upcoming-title" className="font-bold text-white">Sua agenda</h2><p className="text-xs text-slate-400">Próximas aulas e horários da turma.</p></div>
          <button onClick={() => onGo('lessons')} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-amber-300 hover:bg-slate-800">Ver cronograma</button>
        </div>
        {lessons.filter((lesson: any) => new Date(lesson.date).getTime() >= new Date().setHours(0, 0, 0, 0) && lesson.status !== 'CANCELLED' && lesson.status !== 'COMPLETED').sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5).map((lesson: any) => <button key={lesson.id} onClick={() => { onGo('lessons'); onExpandLesson(lesson.id); }} className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-800 py-3 text-left hover:bg-slate-800/40">
          <span className="font-medium text-slate-100">Aula {lesson.lessonNumber}: {lesson.title}</span><span className="text-sm text-slate-400">{formatDate(lesson.date)} · {lesson.scheduleTime}</span>
        </button>)}
        {!lessons.some((lesson: any) => new Date(lesson.date).getTime() >= new Date().setHours(0, 0, 0, 0) && lesson.status !== 'CANCELLED' && lesson.status !== 'COMPLETED') && <p className="rounded-xl border-t border-slate-800 py-3 text-sm text-slate-400">Ainda não há aulas futuras na sua agenda. Quando a direção cadastrar uma aula para sua turma, ela aparecerá aqui.</p>}
      </section>
      {/* Dual Cards: Próxima Aula (O Que Vem Depois) vs Última Aula (O Que Vimos) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PRÓXIMA AULA - ALTA PRIORIDADE */}
        <div className="flex flex-col justify-between rounded-3xl border border-amber-500/30 bg-slate-900/70 p-6 backdrop-blur-md relative overflow-hidden shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Próxima Aula</span>
              </div>
              {classInfo && (
                <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  {classInfo.daysOfWeek} &bull; {classInfo.scheduleTime}
                </span>
              )}
            </div>

            {nextLesson ? (
              <>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Aula {nextLesson.lessonNumber}: {nextLesson.title}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {formatDate(nextLesson.date)}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {nextLesson.scheduleTime}
                  </span>
                  <span>&bull;</span>
                  <span>Prof. {classInfo?.teacherName}</span>
                </div>

                {/* O QUE VEM DEPOIS */}
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      O Que Vem Depois
                    </span>
                    <span className="text-[10px] text-slate-500">Conteúdo Previsto</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    {nextLesson.plannedContent}
                  </p>
                  {nextLesson.activities && (
                    <div className="mt-2.5 pt-2 border-t border-slate-900 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Atividade prevista: {nextLesson.activities}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 py-6">Nenhuma aula futura agendada no momento.</p>
            )}
          </div>

          {/* Attendance Check-in Button */}
          {nextLesson && (
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              {nextLesson.attendanceStatus === 'PRESENT' ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 py-3 text-xs font-bold text-emerald-400 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sua presença já foi confirmada pelo professor!</span>
                </div>
              ) : nextLesson.attendanceStatus === 'PENDING' ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 py-3 text-xs font-bold text-amber-300 shadow-sm">
                  <Clock3 className="w-4 h-4 animate-spin" />
                  <span>Presença Marcada &bull; Aguardando validação do professor em sala</span>
                </div>
              ) : (
                <button
                  onClick={() => onMarkAttendance(nextLesson.id)}
                  disabled={requestingAttendance}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {requestingAttendance ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Marcar Minha Presença na Aula</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ÚLTIMA AULA REALIZADA */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-md shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Última Aula Realizada</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                Concluída
              </span>
            </div>

            {lastLesson ? (
              <>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Aula {lastLesson.lessonNumber}: {lastLesson.title}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>{formatDate(lastLesson.date)}</span>
                  <span>&bull;</span>
                  <span>{lastLesson.scheduleTime}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Presença confirmada
                  </span>
                </div>

                {/* O QUE VIMOS */}
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      O Que Vimos
                    </span>
                    <span className="text-[10px] text-slate-500">Conteúdo Ministrado</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    {lastLesson.actualContent || lastLesson.plannedContent}
                  </p>

                  {lastLesson.materials && (
                    <div className="mt-3 pt-2.5 border-t border-slate-900 text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Material da aula: <strong className="text-slate-300 font-normal">{lastLesson.materials}</strong></span>
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 py-6">Ainda não houve aula ministrada.</p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Frequência da turma:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{student.attendanceRate}% presenças</span>
          </div>
        </div>
      </div>

      {/* RESUMO DE COINS (SEÇÃO 6 & 7) */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-950 p-6 sm:p-7 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Gavel className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Coins no Leilão Bíblia 3D
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Seu Poder de Lance na Temporada
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Você ganha Coins junto com suas atividades acadêmicas e pode usá-las no Leilão Bíblia 3D. Gastar Coins não reduz seu XP, nível ou posição no ranking.
            </p>
          </div>

          <button
            onClick={() => onGo('auction')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
          >
            <Gavel className="w-4 h-4" />
            <span>Ver Itens do Leilão</span>
          </button>
        </div>

        {/* Grid 3 Valores: Total, Em lances, Disponíveis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-amber-500/20">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Saldo Total
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-200 mt-1 block">
              {coinBalance.toLocaleString('pt-BR')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">acumulado em aulas</span>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
            <span className="text-[11px] font-semibold text-amber-300/80 uppercase tracking-wider block">
              Em Lances Ativos
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 mt-1 block">
              {reservedCoins.toLocaleString('pt-BR')}
            </span>
            <span className="text-[10px] text-amber-400/60 mt-0.5 block">reservado em disputas</span>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center shadow-inner">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
              Disponível para Lances
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Zap className="w-5 h-5 fill-emerald-400 text-emerald-400" />
              <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                {availableCoins.toLocaleString('pt-BR')}
              </span>
            </div>
            <span className="text-[10px] text-emerald-300/70 mt-0.5 block">livre para novos lances</span>
          </div>
        </div>
      </div>

      {/* RESUMO DE PROGRESSO ACADÊMICO & CONQUISTAS */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">Seu Desempenho Acadêmico</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onGo('ranking')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Ver Ranking da Turma</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-600">&bull;</span>
            <button
              onClick={() => onGo('badges')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Ver Medalhas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400 block">Classificação</span>
            <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
              #{student.rankingPosition} Lugar
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              entre os {student.totalInClass} alunos da turma
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400 block">Frequência &amp; Sequência</span>
            <span className="text-lg font-black text-amber-400 font-mono mt-1 flex items-center gap-1">
              <Flame className="w-4 h-4 fill-amber-400" />
              {student.streak} aulas seguidas
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {student.attendanceRate}% de presença geral
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400 block">Insígnias Conquistadas</span>
            <span className="text-lg font-black text-amber-400 font-mono mt-1 flex items-center gap-1">
              <Award className="w-4 h-4" />
              {badges.filter((b: any) => b.isEarned).length} de {badges.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              insígnias de honra desbloqueadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
