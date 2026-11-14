'use client';

import React from 'react';
import { History } from 'lucide-react';
import { GamificationSection } from '@/components/student/GamificationSection';
import type { StudentTab } from './student-types';

export function StudentBadges({ data, onGo }: { data: any; onGo: (tab: StudentTab) => void }) {
  const { student = {}, badges = [], recentTransactions = [] } = data;
  return (
    <div className="space-y-6">
      <GamificationSection
        currentXp={student.currentXp}
        level={student.level}
        streak={student.streak}
        rankingPosition={student.rankingPosition}
        totalInClass={student.totalInClass}
        badges={badges}
        onOpenAuction={() => onGo('auction')}
      />

      {/* Extrato Recente de XP */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">Extrato de XP (Pontos Acadêmicos)</h3>
          </div>
          <span className="text-xs text-slate-400">Total acumulado: {student.currentXp} XP</span>
        </div>

        <div className="space-y-2">
          {recentTransactions && recentTransactions.length > 0 ? (
            recentTransactions.map((tx: any) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 font-mono text-xs font-bold text-amber-400">
                    +{tx.amount}
                  </span>
                  <div>
                    <span className="font-medium text-slate-200 block">{tx.description}</span>
                    <span className="text-[10px] text-slate-500">
                      {tx.type} &bull; {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400">+{tx.amount} XP</span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">
              Nenhuma transação recente de XP.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
