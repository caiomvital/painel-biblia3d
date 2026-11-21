import { describe, expect, test } from 'bun:test';
import { matchesQuestion, parseQuestion } from '../../lib/question-bank';

const base = { text: 'Quem derrotou o gigante Golias?', options: ['Moisés', 'Davi', 'Sansão', 'Josué'], correctIndex: 1 };

describe('parseQuestion', () => {
  test('aceita pergunta válida e limpa espaços', () => {
    expect(parseQuestion({ ...base, text: '  Quem derrotou o gigante Golias?  ', topic: ' Davi ' })).toEqual({ ...base, topic: 'Davi' });
  });
  test('exige 4 respostas diferentes e a certa marcada', () => {
    expect(() => parseQuestion({ ...base, options: ['A', 'B', 'C'] })).toThrow('4 respostas');
    expect(() => parseQuestion({ ...base, options: ['A', 'a', 'C', 'D'] })).toThrow('diferentes');
    expect(() => parseQuestion({ ...base, correctIndex: 4 })).toThrow('certa');
    expect(() => parseQuestion({ ...base, text: 'Oi' })).toThrow('entre 5 e 300');
  });
});

describe('matchesQuestion', () => {
  const q = { ...base, topic: 'Bíblia', classId: 'c1', status: 'APPROVED' };
  test('busca sem acento e sem diferenciar maiúsculas, também nas respostas', () => {
    expect(matchesQuestion(q, { search: 'MOISES' })).toBe(true);
    expect(matchesQuestion(q, { search: 'golias' })).toBe(true);
    expect(matchesQuestion(q, { search: 'faraó' })).toBe(false);
  });
  test('filtros de status, tema e turma', () => {
    expect(matchesQuestion(q, { status: 'PENDING' })).toBe(false);
    expect(matchesQuestion(q, { status: 'ALL', topic: 'Bíblia', classId: 'c1' })).toBe(true);
    expect(matchesQuestion(q, { topic: 'Outro' })).toBe(false);
    expect(matchesQuestion(q, { classId: 'c2' })).toBe(false);
  });
});
