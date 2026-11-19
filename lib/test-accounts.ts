/**
 * Contas de teste mostradas na barra lateral da tela de login (modo demonstração).
 * Só aparecem quando TEST_ACCOUNTS_PANEL=1 no ambiente; sem a variável, a API responde 404
 * e o painel some. Para desligar: remova a variável e reinicie o serviço.
 */
export interface TestAccount { login: string; password: string; name: string; role: 'DIRETOR' | 'PROFESSOR' | 'ALUNO'; note: string }

const PASSWORD = 'demo123';

export const TEST_ACCOUNTS: TestAccount[] = [
  { login: 'teste.admin', password: PASSWORD, name: 'Diretor Teste', role: 'DIRETOR', note: 'Gestão completa da escola' },
  { login: 'teste.professor', password: PASSWORD, name: 'Prof. Marcos (teste)', role: 'PROFESSOR', note: 'Turma Bíblia 3D Teste Sábado' },
  { login: 'teste.ana', password: PASSWORD, name: 'Ana Clara', role: 'ALUNO', note: '620 pontos · nível 3' },
  { login: 'teste.pedro', password: PASSWORD, name: 'Pedro Henrique', role: 'ALUNO', note: '470 pontos · nível 2' },
  { login: 'teste.maria', password: PASSWORD, name: 'Maria Eduarda', role: 'ALUNO', note: '390 pontos · nível 2' },
  { login: 'teste.joao', password: PASSWORD, name: 'João Miguel', role: 'ALUNO', note: '260 pontos · nível 1' },
  { login: 'teste.sofia', password: PASSWORD, name: 'Sofia Vitória', role: 'ALUNO', note: '180 pontos · nível 1' },
  { login: 'teste.lucas', password: PASSWORD, name: 'Lucas Gabriel', role: 'ALUNO', note: '90 pontos · nível 1' },
];

export function testAccountsEnabled(): boolean {
  return process.env.TEST_ACCOUNTS_PANEL === '1';
}
