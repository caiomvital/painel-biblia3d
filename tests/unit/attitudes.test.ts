import { describe, expect, test } from 'bun:test';
import { ATTITUDES, LIMITS, attitudeByCode, checkAttitudeLimits, cleanNote, isValidAttitudeId } from '../../lib/attitudes';
import { attitudeRewardSummary } from '../../lib/reward-summary';

describe('catálogo de atitudes', () => {
  test('positivas têm valores > 0; ponto de atenção não tem nenhum', () => {
    for (const a of ATTITUDES) {
      if (a.kind === 'POSITIVE') { expect(a.xp).toBeGreaterThan(0); expect(a.coins).toBeGreaterThan(0); }
      else { expect(a.xp).toBe(0); expect(a.coins).toBe(0); }
    }
  });
  test('códigos são únicos e desconhecidos viram null', () => {
    expect(new Set(ATTITUDES.map((a) => a.code)).size).toBe(ATTITUDES.length);
    expect(attitudeByCode('HELPED')?.label).toBe('Ajudou um colega');
    expect(attitudeByCode('XP_INFINITO')).toBeNull();
    expect(attitudeByCode(undefined)).toBeNull();
  });
  test('nenhum item é negativo (atitude nunca tira nada)', () => {
    expect(ATTITUDES.every((a) => a.xp >= 0 && a.coins >= 0)).toBe(true);
  });
});

describe('limites', () => {
  test('aluno: 3 positivas por dia', () => {
    expect(checkAttitudeLimits('POSITIVE', 2, 0).ok).toBe(true);
    const r = checkAttitudeLimits('POSITIVE', LIMITS.positivePerStudentPerDay, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.reason).toBe('STUDENT_DAY'); expect(r.message).toContain('3'); }
  });
  test('ponto de atenção não conta no limite do aluno', () => {
    expect(checkAttitudeLimits('ATTENTION', 99, 0).ok).toBe(true);
  });
  test('professor: 40 registros por dia, valendo para qualquer tipo', () => {
    for (const kind of ['POSITIVE', 'ATTENTION'] as const) {
      const r = checkAttitudeLimits(kind, 0, LIMITS.perActorPerDay);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('ACTOR_DAY');
    }
  });
});

describe('entradas', () => {
  test('id do aparelho: só formato seguro', () => {
    expect(isValidAttitudeId('b0123456789abcdef0123')).toBe(true);
    expect(isValidAttitudeId('curto')).toBe(false);
    expect(isValidAttitudeId('com espaço e ; aspas ".......')).toBe(false);
    expect(isValidAttitudeId(123)).toBe(false);
  });
  test('anotação é limpa e limitada', () => {
    expect(cleanNote('  oi  ')).toBe('oi');
    expect(cleanNote('   ')).toBeNull();
    expect(cleanNote(5)).toBeNull();
    expect(cleanNote('x'.repeat(500))?.length).toBe(LIMITS.noteMax);
  });
});

describe('attitudeRewardSummary (só totais do aluno)', () => {
  test('copia totais do servidor', () => {
    const s = attitudeRewardSummary({ count: 3, xp: 20, coins: 20 });
    expect(s?.title).toBe('BOA ATITUDE!');
    expect(s?.xp).toBe(20);
    expect(s?.totalCoins).toBe(20);
    expect(s?.items.length).toBe(2);
  });
  test('sem ganho não há tela, e o texto não cita colegas, turma nem quem deu a atitude (só o aviso genérico do Davi)', () => {
    expect(attitudeRewardSummary({ count: 0, xp: 0, coins: 0 })).toBeNull();
    const s = attitudeRewardSummary({ count: 1, xp: 5, coins: 5 });
    expect(s?.tutor?.text).toBe('Seu professor reparou em você!');
    expect(JSON.stringify({ ...s, tutor: undefined }).toLowerCase()).not.toMatch(/professor|colega|turma/);
  });
});
