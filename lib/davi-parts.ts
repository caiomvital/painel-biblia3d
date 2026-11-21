/**
 * Peças vestíveis do Davi (função pura). Cada item do catálogo `davi-*` aponta para imagens em /public/davi.
 * Posições em pixels do palco de 700 x 960 (cabeça: caixa de 502 x 415).
 */
export type DaviLookKey = 'daviHead' | 'daviTunic' | 'daviBoots' | 'daviWrists';

export interface DaviPart {
  code: string;
  /** Nome do arquivo (sem .png e sem lado). Botas e munhequeiras têm -e e -d. */
  file: string;
}

export const DAVI_HEADS: readonly DaviPart[] = [
  { code: 'davi-head-faixa-vermelha', file: 'acc-faixa-vermelha' },
  { code: 'davi-head-faixa-azul', file: 'acc-faixa-azul' },
  { code: 'davi-head-faixa-verde', file: 'acc-faixa-verde' },
  { code: 'davi-head-faixa-branca', file: 'acc-faixa-branca' },
  { code: 'davi-head-faixa-dourada', file: 'acc-faixa-dourada' },
  { code: 'davi-head-turbante', file: 'acc-turbante' },
  { code: 'davi-head-coroa-louros', file: 'acc-coroa-louros' },
  { code: 'davi-head-coroa-ouro', file: 'acc-coroa-ouro' },
];
export const DAVI_TUNICS: readonly DaviPart[] = ['azul', 'vermelha', 'verde', 'amarela', 'roxa', 'capa'].map((c) => ({ code: `davi-tunic-${c}`, file: `tunica-${c}` }));
export const DAVI_BOOTS: readonly DaviPart[] = ['marrom', 'preta', 'azul', 'vermelha', 'dourada'].map((c) => ({ code: `davi-boots-${c}`, file: `bota-${c}` }));
export const DAVI_WRISTS: readonly DaviPart[] = ['marrom', 'azul', 'vermelha', 'dourada'].map((c) => ({ code: `davi-wrists-${c}`, file: `munhequeira-${c}` }));

export const DAVI_PARTS: Record<DaviLookKey, readonly DaviPart[]> = {
  daviHead: DAVI_HEADS, daviTunic: DAVI_TUNICS, daviBoots: DAVI_BOOTS, daviWrists: DAVI_WRISTS,
};

/** Posição e escala de cada acessório de cabeça: escala sobre o tamanho original (em px do palco) e topo na caixa da cabeça. */
export const HEAD_FIT: Record<string, { natW: number; scale: number; top: number }> = {
  'acc-faixa-vermelha': { natW: 392, scale: 0.85, top: 95 }, 'acc-faixa-azul': { natW: 391, scale: 0.85, top: 95 },
  'acc-faixa-verde': { natW: 393, scale: 0.85, top: 95 }, 'acc-faixa-branca': { natW: 392, scale: 0.85, top: 95 },
  'acc-faixa-dourada': { natW: 392, scale: 0.85, top: 95 }, 'acc-turbante': { natW: 409, scale: 0.85, top: 25 },
  'acc-coroa-louros': { natW: 424, scale: 0.8, top: 60 }, 'acc-coroa-ouro': { natW: 392, scale: 0.8, top: -60 },
};

export function partFile(key: DaviLookKey, code: string | undefined): string | null {
  if (!code) return null;
  return DAVI_PARTS[key].find((p) => p.code === code)?.file ?? null;
}

/** Cobertura: capa é mais larga que as túnicas comuns. */
export const TUNIC_FIT = (file: string) => (file === 'tunica-capa' ? { x: 193, y: 423, w: 314 } : { x: 221, y: 430, w: 258 });
