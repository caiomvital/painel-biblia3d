import { describe, expect, test } from 'bun:test';
import { parseLook, sanitizeLookInput } from '../../lib/mascot-look';

const owned = new Set(['color-azul', 'acc-coroa', 'bg-noite', 'frame-estrelas']);

describe('parseLook (lê o que está salvo, nunca lança)', () => {
  test('mantém só campos válidos do catálogo e do encaixe certo', () => {
    expect(parseLook({ color: 'color-azul', accessory: 'acc-coroa', lixo: 'x' })).toEqual({ color: 'color-azul', accessory: 'acc-coroa' });
    expect(parseLook({ color: 'acc-coroa' })).toEqual({}); // acessório no encaixe de cor
    expect(parseLook({ color: 'nao-existe' })).toEqual({});
  });
  test('entradas estranhas viram vazio', () => {
    for (const bad of [null, undefined, 'x', 5, [], [1, 2], { color: 5 }]) expect(parseLook(bad)).toEqual({});
  });
});

describe('sanitizeLookInput (o servidor só equipa o que o aluno tem)', () => {
  test('aceita itens do inventário nos encaixes certos', () => {
    const r = sanitizeLookInput({ color: 'color-azul', accessory: 'acc-coroa', background: 'bg-noite', frame: 'frame-estrelas' }, owned);
    expect(r).toEqual({ ok: true, look: { color: 'color-azul', accessory: 'acc-coroa', background: 'bg-noite', frame: 'frame-estrelas' } });
  });
  test('recusa item que o aluno não tem', () => {
    const r = sanitizeLookInput({ accessory: 'acc-oculos' }, owned);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('conquistou');
  });
  test('recusa item no encaixe errado, inventado ou de tipo errado', () => {
    expect(sanitizeLookInput({ color: 'acc-coroa' }, owned).ok).toBe(false);
    expect(sanitizeLookInput({ color: 'color-inventada' }, owned).ok).toBe(false);
    expect(sanitizeLookInput({ color: 7 }, owned).ok).toBe(false);
  });
  test('recusa campos desconhecidos e formatos que não são objeto', () => {
    expect(sanitizeLookInput({ color: 'color-azul', xp: 999 }, owned).ok).toBe(false);
    for (const bad of [null, undefined, 'x', 5, []]) expect(sanitizeLookInput(bad, owned).ok).toBe(false);
  });
  test('ausente, null ou vazio tira o item do encaixe', () => {
    expect(sanitizeLookInput({}, owned)).toEqual({ ok: true, look: {} });
    expect(sanitizeLookInput({ color: null, accessory: '' }, owned)).toEqual({ ok: true, look: {} });
  });
});
