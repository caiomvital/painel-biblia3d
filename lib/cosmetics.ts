/**
 * Catálogo inicial de itens do Lofi (tudo original, só visual: nenhuma vantagem em jogo, leilão ou pontuação).
 * `tint` é só para desenhar a prévia na tela. O servidor garante o catálogo por `code` (upsert idempotente).
 */
export type SlotName = 'COLOR' | 'ACCESSORY' | 'BACKGROUND' | 'FRAME';
export type RarityName = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface CosmeticDef {
  code: string;
  name: string;
  slot: SlotName;
  rarity: RarityName;
  tint: [string, string];
}

export const COSMETICS: readonly CosmeticDef[] = [
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

export const RARITY_LABEL: Record<RarityName, string> = {
  COMMON: 'Comum',
  RARE: 'Raro',
  EPIC: 'Épico',
  LEGENDARY: 'Lendário',
};
