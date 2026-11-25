'use client';
import { useState } from 'react';
import { panelButton } from './panel-ui';

const account = ['Como altero minha senha ou aparência?', 'Em Meu painel → Minha conta, informe a senha atual para definir uma nova; nessa tela também é possível ajustar cor, tamanho do texto e avisos.'] as const;
const help = {
  DIRETOR: [
    ['Como cadastro turmas e alunos?', 'Abra Turmas para criar a turma. Em Alunos, toque em Cadastrar aluno, escolha a turma e defina o telefone do responsável: ele é o login da criança, com senha inicial tecnologia (ela troca no primeiro acesso).'],
    ['Como encontro uma pessoa ou turma?', 'Use Meu painel → Busca para procurar alunos, professores e turmas. A busca respeita as permissões da direção.'],
    ['Como aprovo perguntas e jogos?', 'Em Alunos ficam o banco de perguntas, os jogos enviados pelas crianças e a avaliação dos professores. Aprove ou rejeite por lá.'],
    account,
  ],
  PROFESSOR: [
    ['Como registro o que dei na aula?', 'Abra Aula e Perguntas, escolha a turma e a data e escreva um tópico por linha. As crianças marcam o que aprenderam.'],
    ['Como faço um quiz ao vivo?', 'Abra Quiz ao vivo, escolha as perguntas e crie a sala. Passe o PIN aos alunos e monte as equipes na hora.'],
    ['Como reconheço uma boa atitude?', 'Em Atitudes, escolha os alunos e a atitude. Eles recebem pontos e fichas na hora.'],
    account,
  ],
  ALUNO: [
    ['Como ganho pontos e fichas?', 'Marque o que aprendeu em O que aprendi, jogue o Desafio do dia e participe do Quiz ao vivo. As fichas servem para dar lances no Leilão.'],
    ['Como entro no quiz ao vivo?', 'O Quiz ao vivo é na sala de aula, pelo computador: clique em Quiz ao vivo e digite o PIN que o professor mostrar.'],
    ['Como mudo meu Lofi e o Davi?', 'Abra Perfil e ajustes e toque em Personalizar e ver coleção. Os itens vêm dos baús.'],
    account,
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
