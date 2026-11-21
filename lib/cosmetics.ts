/**
 * Catálogo inicial de itens do Lofi e do Davi (tudo original, só visual: nenhuma vantagem em jogo, leilão ou pontuação).
 * `tint` é só para desenhar a prévia na tela. O servidor garante o catálogo por `code` (upsert idempotente).
 */
export type SlotName = 'COLOR' | 'ACCESSORY' | 'BACKGROUND' | 'FRAME' | 'DAVI_HEAD' | 'DAVI_TUNIC' | 'DAVI_BOOTS' | 'DAVI_WRISTS';
export type RarityName = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface CosmeticDef {
  code: string;
  name: string;
  slot: SlotName;
  rarity: RarityName;
  tint: [string, string];
}

export const LOFI_COSMETICS: readonly CosmeticDef[] = [
  { code: 'color-azul', name: 'Lofi Azul', slot: 'COLOR', rarity: 'COMMON', tint: ['#5ad1ff', '#2b8fc4'] },
  { code: 'color-verde', name: 'Lofi Verde', slot: 'COLOR', rarity: 'COMMON', tint: ['#4ade80', '#1f9d4f'] },
  { code: 'color-rosa', name: 'Lofi Rosa', slot: 'COLOR', rarity: 'RARE', tint: ['#ff7eb6', '#d93f84'] },
  { code: 'color-roxo', name: 'Lofi Roxo', slot: 'COLOR', rarity: 'EPIC', tint: ['#a78bfa', '#6d4fe0'] },
  { code: 'color-dourado', name: 'Lofi Dourado', slot: 'COLOR', rarity: 'LEGENDARY', tint: ['#ffd23f', '#c99a00'] },
  { code: 'acc-oculos', name: 'Óculos redondos', slot: 'ACCESSORY', rarity: 'COMMON', tint: ['#ffffff', '#3b2f80'] },
  { code: 'acc-bone', name: 'Boné de aventura', slot: 'ACCESSORY', rarity: 'COMMON', tint: ['#ff5d73', '#b8243b'] },
  { code: 'acc-laco', name: 'Laço de estrela', slot: 'ACCESSORY', rarity: 'RARE', tint: ['#ff8fa3', '#d9506b'] },
  { code: 'acc-fones', name: 'Fones de ouvido', slot: 'ACCESSORY', rarity: 'RARE', tint: ['#7cf0c9', '#138a69'] },
  { code: 'acc-coroa', name: 'Coroa de papel', slot: 'ACCESSORY', rarity: 'EPIC', tint: ['#ffd23f', '#c27d00'] },
  { code: 'bg-ceu', name: 'Céu de manhã', slot: 'BACKGROUND', rarity: 'COMMON', tint: ['#8fd3ff', '#e6f7ff'] },
  { code: 'bg-noite', name: 'Noite de estrelas', slot: 'BACKGROUND', rarity: 'RARE', tint: ['#1b1745', '#4a428f'] },
  { code: 'bg-aurora', name: 'Aurora', slot: 'BACKGROUND', rarity: 'EPIC', tint: ['#2fd0a0', '#7b5cff'] },
  { code: 'frame-simples', name: 'Moldura simples', slot: 'FRAME', rarity: 'COMMON', tint: ['#bdb8e6', '#4a428f'] },
  { code: 'frame-estrelas', name: 'Moldura de estrelas', slot: 'FRAME', rarity: 'RARE', tint: ['#ffb21f', '#c27d00'] },
  { code: 'frame-dourada', name: 'Moldura dourada', slot: 'FRAME', rarity: 'LEGENDARY', tint: ['#ffd23f', '#b8860b'] },
];

const T: [string, string] = ['#ffd23f', '#c27d00'];
const davi = (code: string, name: string, slot: SlotName, rarity: RarityName): CosmeticDef => ({ code, name, slot, rarity, tint: T });

/** Itens do Davi (o tutor da Fuctura). Mesmos baús; só visual. */
export const DAVI_COSMETICS: readonly CosmeticDef[] = [
  davi('davi-head-faixa-vermelha', 'Faixa vermelha', 'DAVI_HEAD', 'COMMON'),
  davi('davi-head-faixa-azul', 'Faixa azul', 'DAVI_HEAD', 'COMMON'),
  davi('davi-head-faixa-verde', 'Faixa verde', 'DAVI_HEAD', 'COMMON'),
  davi('davi-head-faixa-branca', 'Faixa branca', 'DAVI_HEAD', 'RARE'),
  davi('davi-head-turbante', 'Turbante', 'DAVI_HEAD', 'RARE'),
  davi('davi-head-faixa-dourada', 'Faixa dourada', 'DAVI_HEAD', 'EPIC'),
  davi('davi-head-coroa-louros', 'Coroa de louros', 'DAVI_HEAD', 'EPIC'),
  davi('davi-head-coroa-ouro', 'Coroa de ouro', 'DAVI_HEAD', 'LEGENDARY'),
  davi('davi-tunic-azul', 'Túnica azul', 'DAVI_TUNIC', 'COMMON'),
  davi('davi-tunic-vermelha', 'Túnica vermelha', 'DAVI_TUNIC', 'COMMON'),
  davi('davi-tunic-verde', 'Túnica verde', 'DAVI_TUNIC', 'COMMON'),
  davi('davi-tunic-amarela', 'Túnica amarela', 'DAVI_TUNIC', 'RARE'),
  davi('davi-tunic-roxa', 'Túnica real', 'DAVI_TUNIC', 'EPIC'),
  davi('davi-tunic-capa', 'Capa de pastor', 'DAVI_TUNIC', 'LEGENDARY'),
  davi('davi-boots-marrom', 'Botas marrons', 'DAVI_BOOTS', 'COMMON'),
  davi('davi-boots-preta', 'Botas pretas', 'DAVI_BOOTS', 'COMMON'),
  davi('davi-boots-azul', 'Botas azuis', 'DAVI_BOOTS', 'RARE'),
  davi('davi-boots-vermelha', 'Botas vermelhas', 'DAVI_BOOTS', 'RARE'),
  davi('davi-boots-dourada', 'Botas douradas', 'DAVI_BOOTS', 'EPIC'),
  davi('davi-wrists-marrom', 'Munhequeiras marrons', 'DAVI_WRISTS', 'COMMON'),
  davi('davi-wrists-azul', 'Munhequeiras azuis', 'DAVI_WRISTS', 'RARE'),
  davi('davi-wrists-vermelha', 'Munhequeiras vermelhas', 'DAVI_WRISTS', 'RARE'),
  davi('davi-wrists-dourada', 'Munhequeiras douradas', 'DAVI_WRISTS', 'EPIC'),
];

export const COSMETICS: readonly CosmeticDef[] = [...LOFI_COSMETICS, ...DAVI_COSMETICS];

export const RARITY_LABEL: Record<RarityName, string> = {
  COMMON: 'Comum',
  RARE: 'Raro',
  EPIC: 'Épico',
  LEGENDARY: 'Lendário',
};
