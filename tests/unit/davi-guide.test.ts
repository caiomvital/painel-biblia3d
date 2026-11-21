import { describe, expect, test } from 'bun:test';
import { daviMessage } from '../../lib/davi-guide';

const base = { firstName: 'Ana', lessonOpen: false, quizPending: false, celebrate: false };

describe('falas do Davi', () => {
  test('comemorar vem primeiro', () => {
    expect(daviMessage({ ...base, celebrate: true, lessonOpen: true, quizPending: true })).toEqual({ text: 'Muito bem, Ana!', mood: 'comemorando' });
  });
  test('aula para contar vem antes do desafio', () => {
    expect(daviMessage({ ...base, lessonOpen: true, quizPending: true }).mood).toBe('pensando');
  });
  test('desafio pendente e fala padrão', () => {
    expect(daviMessage({ ...base, quizPending: true }).text).toBe('Bora fazer o desafio de hoje?');
    expect(daviMessage(base).text).toBe('Estou com você, Ana!');
  });
  test('sem nome não quebra', () => {
    expect(daviMessage({ ...base, firstName: '' }).text).toBe('Estou com você!');
  });
});
