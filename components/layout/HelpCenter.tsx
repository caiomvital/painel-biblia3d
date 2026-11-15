'use client';
import { useState } from 'react';
import { panelButton } from './panel-ui';

const help = {
  DIRETOR: [
    ['Como acompanho o que exige atenção?', 'Abra Pendências no Meu painel para ir direto a inscrições, presenças e diários que precisam de análise. Os indicadores da Visão Geral mostram os totais atuais.'],
    ['Como encontro uma pessoa ou turma?', 'Use Meu painel → Busca para procurar alunos, professores e turmas. A busca respeita as permissões da direção.'],
    ['Como vejo a agenda?', 'A Visão Geral lista as próximas aulas. Abra Turmas para consultar a agenda e os diários de cada turma.'],
    ['Como altero minha senha ou aparência?', 'Em Meu painel → Minha conta, informe a senha atual para definir uma nova; nessa tela também é possível ajustar cor, tamanho do texto e avisos.'],
  ],
  PROFESSOR: [
    ['Como resolvo uma presença pendente?', 'Na Visão Geral, selecione a solicitação para abrir a turma e a aula correspondentes. Você também pode usar Presenças para filtrar e confirmar ou recusar.'],
    ['Como preencho o diário?', 'Abra Aulas e Diário, escolha uma turma e selecione a aula. Registre os tópicos planejados e ministrados, materiais e atividades.'],
    ['Onde vejo minhas próximas aulas?', 'A Visão Geral mostra a próxima aula; Minhas Turmas lista as aulas de cada turma.'],
    ['Como altero minha senha ou aparência?', 'Em Meu painel → Minha conta, informe a senha atual para definir uma nova; nessa tela também é possível ajustar cor, tamanho do texto e avisos.'],
  ],
  ALUNO: [
    ['Como acompanho meu progresso?', 'A Visão Geral mostra seu nível, XP, frequência e a próxima aula. Abra Aulas & Cronograma para rever os conteúdos e o registro de presença.'],
    ['Como marco presença?', 'Na próxima aula, use “Marcar minha presença”. O professor precisa validar a solicitação.'],
    ['Como envio meu currículo?', 'Abra Meu Currículo, selecione um arquivo PDF e envie. A direção poderá consultá-lo.'],
    ['Como altero minha senha ou aparência?', 'Em Meu painel → Minha conta, informe a senha atual para definir uma nova; nessa tela também é possível ajustar cor, tamanho do texto e avisos.'],
  ],
} as const;

export function HelpCenter({ role }: { role: string }) {
  const entries = help[role as keyof typeof help] ?? help.ALUNO;
  const [open, setOpen] = useState<number | null>(0);
  return <section className="space-y-2" aria-label="Perguntas frequentes">
    <p className="mb-3 text-sm text-slate-400">Orientações rápidas para as tarefas mais comuns do seu perfil.</p>
    {entries.map(([question, answer], index) => <article key={question} className="rounded-xl border border-slate-800 p-3">
      <button className={`${panelButton} w-full text-left`} aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>{question}<span className="float-right text-amber-300">{open === index ? '−' : '+'}</span></button>
      {open === index && <p className="px-3 pt-3 text-sm leading-relaxed text-slate-300">{answer}</p>}
    </article>)}
    <p className="pt-2 text-xs text-slate-500">Se algo parecer incorreto, atualize a página e tente novamente. Em caso de erro persistente, contate a equipe da escola.</p>
  </section>;
}
