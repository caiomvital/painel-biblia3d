'use client';
import { useEffect, useRef, useState } from 'react';

type Step = { emoji: string; title: string; text: string };
export type TourRole = 'VISITANTE' | 'ALUNO' | 'PROFESSOR' | 'DIRETOR';

const steps: Record<TourRole, Step[]> = {
  VISITANTE: [
    { emoji: '👋', title: 'Bem-vindo ao Painel Bíblia 3D', text: 'Um painel de estudos em formato de jogo: os alunos ganham pontos, sobem de nível e trocam fichas por prêmios. Professores e direção acompanham tudo em um só lugar.' },
    { emoji: '🔑', title: 'Três tipos de acesso', text: 'Aluno, Professor e Diretor entram pela mesma tela. O painel reconhece o perfil sozinho e mostra só o que cada pessoa precisa.' },
    { emoji: '🧪', title: 'Use as contas de teste', text: 'Na barra lateral estão as contas de demonstração, já com dados. Toque em “Entrar com esta conta” e explore. Dá para trocar de perfil a qualquer momento por ela.' },
  ],
  ALUNO: [
    { emoji: '🏠', title: 'Início', text: 'Aqui ficam seu nível, seus pontos, sua sequência de dias e o Lofi, o robozinho laranja que acompanha você. Entrar todo dia já rende pontos.' },
    { emoji: '🎯', title: 'Desafios', text: 'O desafio do dia traz 5 perguntas iguais para a turma toda. Cada acerto vale pontos, e gabaritar dá bônus. Depois das aulas você também marca o que aprendeu e avalia o professor.' },
    { emoji: '🔨', title: 'Leilão', text: 'Pontos viram fichas. Use as fichas para dar lances em prêmios reais. Os lances abrem a partir das 19h, e dá para retirar o lance e correr para outro prêmio. Gastar fichas não diminui seu nível.' },
    { emoji: '🎮', title: 'Jogos', text: 'Jogos feitos para a turma. Você também pode criar o seu e enviar: depois que a direção aprovar, ele aparece para todo mundo.' },
    { emoji: '⭐', title: 'Perfil e Lofi', text: 'Abra baús e deixe o Lofi e o Davi com a sua cara: cores, acessórios e fundos desbloqueados ao longo do caminho.' },
  ],
  PROFESSOR: [
    { emoji: '📋', title: 'Seu painel de turma', text: 'A Visão Geral resume suas turmas e seus alunos. Use as abas no topo para navegar.' },
    { emoji: '📝', title: 'Turmas e alunos', text: 'Em Minhas Turmas e Alunos você vê quem está em cada turma e pode adicionar ou remover alunos.' },
    { emoji: '❓', title: 'Aula e Perguntas', text: 'Registre os tópicos da aula (os alunos marcam o que aprenderam) e cadastre perguntas da turma. As perguntas entram como pendentes até a direção aprovar.' },
    { emoji: '🏅', title: 'Atitudes', text: 'Reconheça bons comportamentos dando pontos e fichas aos alunos. Eles recebem um aviso e a turma sente a diferença na hora.' },
    { emoji: '📈', title: 'Avaliações', text: 'Os alunos avaliam a aula uma vez por semana. Você vê a média e os comentários, sem o nome de quem escreveu.' },
  ],
  DIRETOR: [
    { emoji: '🏫', title: 'Visão Geral', text: 'Os números da escola num só lugar. As abas no topo levam a cada área da gestão.' },
    { emoji: '👥', title: 'Cursos, Turmas e Alunos', text: 'Cadastre cursos e turmas e atribua professores. Em Alunos você cadastra os alunos, define o telefone do responsável (o login da criança) e redefine senhas.' },
    { emoji: '✅', title: 'Aprovações', text: 'Perguntas dos professores e jogos criados pelos alunos ficam pendentes até você aprovar. Só depois disso as crianças veem.' },
    { emoji: '🎁', title: 'Gamificação e Leilões', text: 'Crie os prêmios do leilão, defina preços e prazos e acompanhe os lances. Em Atitudes você vê o que os professores reconheceram.' },
    { emoji: '🔐', title: 'Conta e ajuda', text: 'Em Meu painel → Minha conta você muda a senha e a aparência. A Ajuda tem respostas rápidas para as tarefas mais comuns.' },
  ],
};

export const TOUR_EVENT = 'b3d:open-tour';
const keyFor = (role: TourRole, id?: string | null) => `b3d-onboarding:${role}:${id ?? 'visitante'}`;

/**
 * Tour de boas-vindas: abre sozinho na primeira vez de cada pessoa e pode ser reaberto pela barra de contas de teste.
 * O aluno não tem tour (a criança descobre mexendo, como num jogo); os passos dele ficam só como referência.
 */
export function OnboardingTour({ role, userId }: { role: TourRole; userId?: string | null }) {
  const [open, setOpen] = useState(() => {
    if (role === 'ALUNO') return false;
    try { return localStorage.getItem(keyFor(role, userId)) !== '1'; } catch { return true; }
  });
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const list = steps[role];

  useEffect(() => {
    const reopen = () => { if (role === 'ALUNO') return; setI(0); setOpen(true); };
    window.addEventListener(TOUR_EVENT, reopen);
    return () => window.removeEventListener(TOUR_EVENT, reopen);
  }, [role]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => {
    try { localStorage.setItem(keyFor(role, userId), '1'); } catch { /* sem storage */ }
    setOpen(false);
  };
  const step = list[i];
  const last = i === list.length - 1;

  return (
    <dialog ref={ref} aria-label="Tour do painel" onCancel={(e) => { e.preventDefault(); close(); }}
      className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70">
      {open && <div className="p-6 text-center">
        <div className="text-5xl" aria-hidden>{step.emoji}</div>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-amber-300">Passo {i + 1} de {list.length}</p>
        <h2 className="mt-1 text-xl font-black">{step.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{step.text}</p>
        <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
          {list.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-700'}`} />)}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="px-2 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">Pular</button>
          <div className="flex gap-2">
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold">Voltar</button>}
            <button type="button" autoFocus onClick={() => (last ? close() : setI(i + 1))} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400">{last ? 'Começar' : 'Próximo'}</button>
          </div>
        </div>
      </div>}
    </dialog>
  );
}
