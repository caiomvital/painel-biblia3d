import { describe, expect, test } from 'bun:test';
import { cleanTeamName, generatePin, isPin, livePhase, livePoints, rankTeams, secondsLeft } from '../../lib/live-quiz';

describe('PIN', () => {
  test('sempre 6 dígitos', () => {
    expect(generatePin(() => 0)).toBe('100000');
    expect(generatePin(() => 0.999999)).toBe('999999');
    expect(isPin('123456')).toBe(true);
    for (const bad of ['12345', '1234567', 'abcdef', '12 456', 123456, null]) expect(isPin(bad)).toBe(false);
  });
});

describe('pontos por velocidade', () => {
  test('1000 na hora, 500 no limite, 0 se errar ou passar do tempo', () => {
    expect(livePoints(true, 0, 20000)).toBe(1000);
    expect(livePoints(true, 10000, 20000)).toBe(750);
    expect(livePoints(true, 20000, 20000)).toBe(500);
    expect(livePoints(true, 20001, 20000)).toBe(0);
    expect(livePoints(false, 100, 20000)).toBe(0);
    expect(livePoints(true, -5, 20000)).toBe(0);
  });
});

describe('fase', () => {
  const t0 = new Date('2026-11-21T12:00:00Z');
  test('aberta até o tempo acabar', () => {
    expect(livePhase('QUESTION', t0, 20, new Date(t0.getTime() + 19_999))).toBe('OPEN');
    expect(livePhase('QUESTION', t0, 20, new Date(t0.getTime() + 20_000))).toBe('CLOSED');
    expect(livePhase('REVEAL', t0, 20, t0)).toBe('CLOSED');
    expect(livePhase('LOBBY', null, 20, t0)).toBe('LOBBY');
    expect(livePhase('FINISHED', t0, 20, t0)).toBe('FINISHED');
    expect(secondsLeft(t0, 20, new Date(t0.getTime() + 5_500))).toBe(15);
    expect(secondsLeft(t0, 20, new Date(t0.getTime() + 99_000))).toBe(0);
  });
});

describe('nome da equipe', () => {
  test('limpa espaços, recusa vazio e nome grande', () => {
    expect(cleanTeamName('  Equipe   Leão ')).toBe('Equipe Leão');
    expect(() => cleanTeamName('   ')).toThrow();
    expect(() => cleanTeamName('x'.repeat(31))).toThrow();
  });
});

describe('ranking por equipe', () => {
  const teams = [{ id: 'A', name: 'Equipe A' }, { id: 'B', name: 'Equipe B' }, { id: 'C', name: 'Vazia' }];
  const players = [{ id: 'p1', teamId: 'A' }, { id: 'p2', teamId: 'A' }, { id: 'p3', teamId: 'B' }];
  const ans = (playerId: string, points: number, questionIndex = 0) => ({ playerId, points, correct: points > 0, questionIndex });
  test('média por integrante, ignora equipe sem ninguém', () => {
    const r = rankTeams(teams, players, [ans('p1', 1000), ans('p2', 0), ans('p3', 600)], 0);
    expect(r.map((x) => [x.name, x.points, x.rank])).toEqual([['Equipe B', 600, 1], ['Equipe A', 500, 2]]);
    expect(r.find((x) => x.id === 'A')?.answeredNow).toBe(2);
  });
  test('empate divide a posição', () => {
    const r = rankTeams(teams, players, [ans('p1', 800), ans('p2', 800), ans('p3', 800)], 0);
    expect(r.map((x) => x.rank)).toEqual([1, 1]);
  });
});
