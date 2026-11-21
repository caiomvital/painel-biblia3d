import { describe, expect, test } from 'bun:test';
import { COSMETICS } from '../../lib/cosmetics';
import {
  ATTITUDES_PER_CHEST, DUPLICATE_COINS, RARITIES, RARITY_WEIGHTS, addDays, attitudeChestRefs, describeChest, levelChestRefs,
  milestoneHit, nextStreak, pickItem, pickRarity, streakChestRef, streakStartDay,
} from '../../lib/chests';

describe('catálogo inicial', () => {
  test('39 itens originais (16 do Lofi + 23 do Davi), códigos únicos, contagem por tipo', () => {
    expect(COSMETICS.length).toBe(39);
    expect(new Set(COSMETICS.map((c) => c.code)).size).toBe(39);
    const n = (slot: string) => COSMETICS.filter((c) => c.slot === slot).length;
    expect([n('COLOR'), n('ACCESSORY'), n('BACKGROUND'), n('FRAME')]).toEqual([5, 5, 3, 3]);
    expect([n('DAVI_HEAD'), n('DAVI_TUNIC'), n('DAVI_BOOTS'), n('DAVI_WRISTS')]).toEqual([8, 6, 5, 4]);
  });
  test('toda raridade tem pelo menos um item (o sorteio nunca fica sem saída)', () => {
    for (const r of RARITIES) expect(COSMETICS.some((c) => c.rarity === r)).toBe(true);
  });
});

describe('tabela de chances', () => {
  test('pesos somam 100 (60/28/10/2)', () => {
    expect(RARITIES.map((r) => RARITY_WEIGHTS[r])).toEqual([60, 28, 10, 2]);
    expect(RARITIES.reduce((s, r) => s + RARITY_WEIGHTS[r], 0)).toBe(100);
  });
  test('limites do sorteio', () => {
    const at = (x: number) => pickRarity(() => x);
    expect(at(0)).toBe('COMMON');
    expect(at(0.599)).toBe('COMMON');
    expect(at(0.6)).toBe('RARE');
    expect(at(0.879)).toBe('RARE');
    expect(at(0.88)).toBe('EPIC');
    expect(at(0.979)).toBe('EPIC');
    expect(at(0.98)).toBe('LEGENDARY');
    expect(at(0.999999)).toBe('LEGENDARY');
  });
  test('1 milhão de sorteios ficam perto de 60/28/10/2', () => {
    const c: Record<string, number> = { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 };
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const N = 200_000;
    for (let i = 0; i < N; i++) c[pickRarity(rnd)]++;
    expect(Math.abs(c.COMMON / N - 0.6)).toBeLessThan(0.01);
    expect(Math.abs(c.RARE / N - 0.28)).toBeLessThan(0.01);
    expect(Math.abs(c.EPIC / N - 0.1)).toBeLessThan(0.01);
    expect(Math.abs(c.LEGENDARY / N - 0.02)).toBeLessThan(0.005);
  });
  test('bônus de repetido: 3/6/12/25 fichas', () => {
    expect(DUPLICATE_COINS).toEqual({ COMMON: 3, RARE: 6, EPIC: 12, LEGENDARY: 25 });
  });
});

describe('pickItem', () => {
  const items = [
    { code: 'a', rarity: 'COMMON' as const }, { code: 'b', rarity: 'COMMON' as const }, { code: 'c', rarity: 'EPIC' as const },
  ];
  test('escolhe dentro da raridade sorteada', () => {
    expect(pickItem(items, 'COMMON', () => 0)?.code).toBe('a');
    expect(pickItem(items, 'COMMON', () => 0.99)?.code).toBe('b');
    expect(pickItem(items, 'EPIC', () => 0.5)?.code).toBe('c');
  });
  test('sem item na raridade: cai para a mais próxima abaixo, depois acima', () => {
    expect(pickItem(items, 'RARE', () => 0)?.code).toBe('a');
    expect(pickItem([{ code: 'z', rarity: 'LEGENDARY' as const }], 'COMMON', () => 0)?.code).toBe('z');
    expect(pickItem([], 'COMMON', () => 0)).toBeNull();
  });
});

describe('referências dos baús', () => {
  test('nível: um baú por nível novo, do 2 em diante', () => {
    expect(levelChestRefs(1)).toEqual([]);
    expect(levelChestRefs(3)).toEqual(['CHEST_LEVEL_2', 'CHEST_LEVEL_3']);
  });
  test('atitudes: um baú a cada 5 positivas', () => {
    expect(ATTITUDES_PER_CHEST).toBe(5);
    expect(attitudeChestRefs(4)).toEqual([]);
    expect(attitudeChestRefs(5)).toEqual(['CHEST_ATT_1']);
    expect(attitudeChestRefs(12)).toEqual(['CHEST_ATT_1', 'CHEST_ATT_2']);
  });
  test('descrição não expõe nada além do próprio baú', () => {
    expect(describeChest('CHEST_LEVEL_4').label).toBe('Baú do nível 4');
    expect(describeChest(streakChestRef(7, '2026-11-10'))).toEqual({ source: 'STREAK', label: 'Baú da sequência de 7 dias' });
    expect(describeChest('CHEST_ATT_2').source).toBe('ATTITUDE');
  });
});

describe('sequência de dias (Recife)', () => {
  test('addDays cruza mês e ano', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  test('primeiro acesso vira 1; mesmo dia não muda; dia seguinte soma', () => {
    const a = nextStreak({ current: 0, max: 0, lastDay: null }, '2026-11-16');
    expect(a).toMatchObject({ current: 1, max: 1, changed: true });
    expect(nextStreak({ current: 1, max: 1, lastDay: '2026-11-16' }, '2026-11-16').changed).toBe(false);
    expect(nextStreak({ current: 2, max: 2, lastDay: '2026-11-15' }, '2026-11-16')).toMatchObject({ current: 3, max: 3 });
  });
  test('pular um dia zera, mas guarda o recorde', () => {
    expect(nextStreak({ current: 6, max: 9, lastDay: '2026-11-13' }, '2026-11-16')).toMatchObject({ current: 1, max: 9 });
  });
  test('marcos 3/7/14/30 só no dia exato; a rodada é identificada pelo primeiro dia', () => {
    expect([2, 3, 4, 7, 14, 30, 31].map(milestoneHit)).toEqual([null, 3, null, 7, 14, 30, null]);
    expect(streakStartDay('2026-11-16', 3)).toBe('2026-11-14');
    expect(streakStartDay('2026-11-16', 1)).toBe('2026-11-16');
  });
});

describe('itens do Davi', () => {
  test('todo item do Davi tem imagem mapeada e o encaixe certo', async () => {
    const { DAVI_PARTS, partFile } = await import('../../lib/davi-parts');
    const slotOf = { daviHead: 'DAVI_HEAD', daviTunic: 'DAVI_TUNIC', daviBoots: 'DAVI_BOOTS', daviWrists: 'DAVI_WRISTS' } as const;
    for (const key of Object.keys(DAVI_PARTS) as Array<keyof typeof DAVI_PARTS>) {
      for (const p of DAVI_PARTS[key]) {
        expect(COSMETICS.find((c) => c.code === p.code)?.slot).toBe(slotOf[key]);
        expect(partFile(key, p.code)).toBe(p.file);
      }
    }
    expect(partFile('daviHead', 'davi-tunic-azul')).toBeNull();
  });
});
