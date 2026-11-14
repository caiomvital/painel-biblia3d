'use client';

import React from 'react';
import { Calendar, BookOpen, CheckCircle2, Clock3, AlertTriangle, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from './student-types';

export function StudentLessons({ data, expandedLessonId, onExpandLesson }: { data: any; expandedLessonId: string | null; onExpandLesson: (id: string | null) => void }) {
  const { classInfo, nextLesson, missedLessons = [], lessons = [] } = data;
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Cronograma de Aulas &bull; {classInfo?.name}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico e próximas aulas registradas no sistema acadêmico.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Frequência: {classInfo?.lessonsPerWeek} aula(s)/semana
        </span>
      </div>

      {/* Missed content alert if present */}
      {missedLessons && missedLessons.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Você possui {missedLessons.length} aula(s) com falta registrada</span>
            <span className="text-[11px] text-amber-300/80">
              Consulte os conteúdos abaixo para manter seu aprendizado em dia com a turma.
            </span>
          </div>
        </div>
      )}

      {/* Real Lessons List from Database */}
      <div className="space-y-3">
        {lessons && lessons.length > 0 ? (
          lessons.map((les: any) => {
            const isExpanded = expandedLessonId === les.id;
            const isCurrent = les.id === nextLesson?.id;

            return (
              <div
                key={les.id}
                data-testid={`lesson-${les.id}`}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isCurrent
                    ? 'border-amber-500/40 bg-slate-900/80 shadow-md shadow-amber-500/10'
                    : les.status === 'COMPLETED'
                    ? 'border-slate-800/80 bg-slate-950/60'
                    : 'border-slate-800/60 bg-slate-950/40'
                }`}
              >
                <div
                  onClick={() => onExpandLesson(isExpanded ? null : les.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                        les.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isCurrent
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {les.lessonNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{les.title}</h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded shrink-0">
                            Próxima Aula
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block truncate">
                        {formatDate(les.date)} &bull; {les.scheduleTime} &bull; Prof. {les.teacherName || classInfo?.teacherName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {les.attendanceStatus === 'PRESENT' && (
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Presente</span>
                      </span>
                    )}
                    {les.attendanceStatus === 'PENDING' && (
                      <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                        <Clock3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Pendente</span>
                      </span>
                    )}
                    {les.attendanceStatus === 'ABSENT' && (
                      <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                        <span className="hidden sm:inline">Falta</span>
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (() => {
                  const plannedList: string[] =
                    Array.isArray(les.plannedTopics)
                      ? les.plannedTopics
                      : les.plannedContent
                      ? les.plannedContent
                          .split('\n')
                          .map((l: string) => l.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim())
                          .filter(Boolean)
                      : [];

                  const taughtList: string[] =
                    Array.isArray(les.taughtTopics)
                      ? les.taughtTopics
                      : les.actualContent
                      ? les.actualContent
                          .split('\n')
                          .map((l: string) => l.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim())
                          .filter(Boolean)
                      : [];

                  let materialsList: Array<{ id: string; title: string; url: string; description?: string }> = [];
                  if (Array.isArray(les.supportMaterials) && les.supportMaterials.length > 0) {
                    materialsList = les.supportMaterials;
                  } else if (les.materials) {
                    try {
                      const parsed = JSON.parse(les.materials);
                      if (Array.isArray(parsed)) materialsList = parsed;
                    } catch {
                      // Texto legado
                    }
                  }

                  return (
                    <div className="p-4 sm:p-5 bg-slate-900/50 border-t border-slate-800/80 text-xs space-y-4">
                      {/* 1. O que vamos aprender (Tópicos Planejados) */}
                      <div className="space-y-1.5">
                        <strong className="text-amber-400 font-bold flex items-center gap-1.5 text-xs">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>O que vamos aprender</span>
                        </strong>
                        {plannedList.length > 0 ? (
                          <ul className="space-y-1 pl-1 text-slate-300">
                            {plannedList.map((topic, tIdx) => (
                              <li key={tIdx} className="flex items-start gap-2 text-xs leading-relaxed">
                                <span className="text-amber-500 font-bold">&bull;</span>
                                <span>{topic}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-500 italic text-xs">
                            Nenhum tópico planejado registrado até o momento.
                          </p>
                        )}
                      </div>

                      {/* 2. O que aprendemos (Tópicos Ministrados - só aparece quando registrado) */}
                      {taughtList.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                          <strong className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>O que aprendemos</span>
                          </strong>
                          <ul className="space-y-1 pl-1 text-slate-300">
                            {taughtList.map((topic, tIdx) => (
                              <li key={tIdx} className="flex items-start gap-2 text-xs leading-relaxed">
                                <span className="text-emerald-500 font-bold">&bull;</span>
                                <span>{topic}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 3. Materiais de apoio */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                        <strong className="text-amber-400 font-bold flex items-center gap-1.5 text-xs">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Materiais de apoio</span>
                        </strong>
                        {materialsList.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {materialsList.map((mat, mIdx) => (
                              <div
                                key={mat.id || mIdx}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs gap-3"
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold text-white block truncate">{mat.title}</span>
                                  {mat.description && (
                                    <span className="text-[11px] text-slate-400 block truncate">{mat.description}</span>
                                  )}
                                </div>
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                                >
                                  <span>Abrir</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 italic text-xs">
                            Nenhum material de apoio cadastrado para esta aula.
                          </p>
                        )}
                      </div>

                      {les.activities && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Atividade: <strong className="text-slate-300 font-normal">{les.activities}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-800 bg-slate-950/40">
            Nenhuma aula cadastrada para esta turma.
          </div>
        )}
      </div>
    </div>
  );
}
