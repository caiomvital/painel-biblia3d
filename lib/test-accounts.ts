/**
 * Contas de teste mostradas na barra lateral da tela de login (modo demonstração).
 * Só aparecem quando TEST_ACCOUNTS_PANEL=1 no ambiente; sem a variável, a API responde 404
 * e o painel some. Para desligar: remova a variável e reinicie o serviço.
 */
export interface TestAccount { login: string; password: string; name: string; role: 'DIRETOR' | 'PROFESSOR' | 'ALUNO'; note: string }

const PASSWORD = 'demo123';

export const TEST_ACCOUNTS: TestAccount[] = [
  { login: 'teste.diretor', password: PASSWORD, name: 'Helena Duarte', role: 'DIRETOR', note: 'Gestão completa da escola' },
  { login: 'teste.prof1', password: PASSWORD, name: 'Marcos Silva', role: 'PROFESSOR', note: 'Turma Sábado Manhã (4 alunos)' },
  { login: 'teste.prof2', password: PASSWORD, name: 'Juliana Costa', role: 'PROFESSOR', note: 'Turma Sábado Tarde (5 alunos)' },
  { login: 'teste.prof3', password: PASSWORD, name: 'Rafael Lima', role: 'PROFESSOR', note: 'Turma Domingo (7 alunos)' },
  { login: 'teste.ana', password: PASSWORD, name: 'Ana Clara', role: 'ALUNO', note: '620 pontos · nível 3 · Sábado Manhã' },
  { login: 'teste.pedro', password: PASSWORD, name: 'Pedro Henrique', role: 'ALUNO', note: '470 pontos · nível 2 · Sábado Manhã' },
  { login: 'teste.maria', password: PASSWORD, name: 'Maria Eduarda', role: 'ALUNO', note: '390 pontos · nível 2 · Sábado Manhã' },
  { login: 'teste.joao', password: PASSWORD, name: 'João Miguel', role: 'ALUNO', note: '260 pontos · nível 1 · Sábado Manhã' },
  { login: 'teste.sofia', password: PASSWORD, name: 'Sofia Vitória', role: 'ALUNO', note: '540 pontos · nível 2 · Sábado Tarde' },
  { login: 'teste.lucas', password: PASSWORD, name: 'Lucas Gabriel', role: 'ALUNO', note: '430 pontos · nível 2 · Sábado Tarde' },
  { login: 'teste.beatriz', password: PASSWORD, name: 'Beatriz Nunes', role: 'ALUNO', note: '350 pontos · nível 2 · Sábado Tarde' },
  { login: 'teste.davi', password: PASSWORD, name: 'Davi Lucca', role: 'ALUNO', note: '210 pontos · nível 1 · Sábado Tarde' },
  { login: 'teste.laura', password: PASSWORD, name: 'Laura Mendes', role: 'ALUNO', note: '120 pontos · nível 1 · Sábado Tarde' },
  { login: 'teste.gabriel', password: PASSWORD, name: 'Gabriel Rocha', role: 'ALUNO', note: '710 pontos · nível 3 · Domingo' },
  { login: 'teste.isabela', password: PASSWORD, name: 'Isabela Freitas', role: 'ALUNO', note: '580 pontos · nível 2 · Domingo' },
  { login: 'teste.matheus', password: PASSWORD, name: 'Matheus Barros', role: 'ALUNO', note: '460 pontos · nível 2 · Domingo' },
  { login: 'teste.alice', password: PASSWORD, name: 'Alice Cardoso', role: 'ALUNO', note: '380 pontos · nível 2 · Domingo' },
  { login: 'teste.heitor', password: PASSWORD, name: 'Heitor Santana', role: 'ALUNO', note: '300 pontos · nível 2 · Domingo' },
  { login: 'teste.valentina', password: PASSWORD, name: 'Valentina Dias', role: 'ALUNO', note: '190 pontos · nível 1 · Domingo' },
  { login: 'teste.enzo', password: PASSWORD, name: 'Enzo Pereira', role: 'ALUNO', note: '80 pontos · nível 1 · Domingo' },
];

export function testAccountsEnabled(): boolean {
  return process.env.TEST_ACCOUNTS_PANEL === '1';
}
