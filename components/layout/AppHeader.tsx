'use client';

import React from 'react';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';
import { LogOut, User, Shield, GraduationCap, School } from 'lucide-react';
import Image from 'next/image';
import { PanelColorPicker } from './PanelColorPicker';
import { PanelTools } from './PanelTools';

interface AppHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ALUNO' | 'PROFESSOR' | 'SECRETARIA' | 'DIRETOR';
  } | null;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ user, onLogout }) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'DIRETOR':
        return {
          label: 'Diretor (Admin)',
          icon: <Shield className="w-3 h-3 text-amber-400" />,
          color: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
        };
      case 'PROFESSOR':
        return {
          label: 'Professor',
          icon: <School className="w-3 h-3 text-amber-400" />,
          color: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
        };
      case 'SECRETARIA':
        return {
          label: 'Secretaria',
          icon: <School className="w-3 h-3 text-violet-400" />,
          color: 'text-violet-300 border-violet-500/30 bg-violet-500/10',
        };
      case 'ALUNO':
      default:
        return {
          label: 'Aluno',
          icon: <GraduationCap className="w-3 h-3 text-emerald-400" />,
          color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
        };
    }
  };

  const roleInfo = user ? getRoleBadge(user.role) : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:h-16 lg:flex-nowrap lg:px-8 lg:py-0">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-blue-600 to-indigo-600 p-[1px] shadow-sm shadow-amber-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950">
              <span className="font-mono text-base font-black tracking-tighter text-amber-400">F</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-wider text-white">FUCTURA</span>
              <span className="text-[10px] font-semibold tracking-widest text-amber-400 uppercase">TECNOLOGIA</span>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Escola de Informática &bull; Recife - PE</span>
          </div>
        </div>

        {/* Action Controls & User Identity */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <PWAInstallButton compact />
          {user && <PanelColorPicker />}
          {user && <PanelTools role={user.role} />}

          {user && (
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-800">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-slate-200 line-clamp-1 max-w-[140px]">{user.name}</span>
                {roleInfo && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${roleInfo.color}`}>
                    {roleInfo.icon}
                    <span>{roleInfo.label}</span>
                  </div>
                )}
              </div>

              {/* Mobile Role badge */}
              {roleInfo && (
                <div className={`sm:hidden flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium ${roleInfo.color}`}>
                  {roleInfo.icon}
                  <span>{roleInfo.label}</span>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                title="Sair da conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
