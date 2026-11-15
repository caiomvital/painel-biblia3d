'use client';
import { useMemo, useState } from 'react';
import { navigatePanel } from '@/lib/panel-navigation';
import { panelButton, panelField } from './panel-ui';

const links = {
  DIRETOR: [
    ['Pendências', 'pendência tarefa aviso', 'overview'],
    ['Turmas e calendário', 'turma aulas agenda calendário', 'classes'],
    ['Alunos', 'aluno estudante matrícula', 'students'],
    ['Professores', 'professor docente equipe', 'teachers'],
    ['Aulas e presenças', 'aula presença frequência diário', 'attendance'],
    ['Leilões e lances', 'leilão lance moedas', 'auction'],
  ],
  PROFESSOR: [
    ['Visão geral', 'início resumo indicadores', 'overview'],
    ['Minhas turmas', 'turma alunos estudantes', 'classes'],
    ['Aulas e diário', 'aula agenda calendário conteúdo diário', 'lessons'],
    ['Presenças pendentes', 'presença chamada frequência confirmar', 'attendance'],
  ],
  ALUNO: [
    ['Visão geral e progresso', 'início xp nível evolução', 'overview'],
    ['Aulas e cronograma', 'aula agenda calendário próxima', 'lessons'],
    ['Leilão', 'leilão lance coins', 'auction'],
  ],
} as const;

export function QuickAccess({ role, onNavigate }: { role: string; onNavigate: () => void }) {
  const [query, setQuery] = useState('');
  const entries = links[role as keyof typeof links] ?? links.ALUNO;
  const filtered = useMemo(() => entries.filter(([label, terms]) => `${label} ${terms}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))), [entries, query]);
  return <section className="space-y-3" aria-label="Busca de áreas do painel">
    <p className="text-sm text-slate-400">Encontre uma área do seu painel pelo nome ou pelo que deseja fazer.</p>
    <label className="block text-sm">Buscar no painel<input autoFocus className={panelField} value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: presença, calendário, turma" /></label>
    <div className="grid gap-2 sm:grid-cols-2">
      {filtered.map(([label, , target]) => <button key={target} className={`${panelButton} text-left`} onClick={() => { navigatePanel({ target }); onNavigate(); }}>{label}<span className="ml-2 text-amber-300" aria-hidden="true">→</span></button>)}
    </div>
    {filtered.length === 0 && <p className="text-sm text-slate-400">Nenhuma área corresponde à busca. Tente “aula”, “turma” ou “presença”.</p>}
  </section>;
}
