/**
 * Temas visuais do painel do aluno (função pura, sem banco; usada pelo servidor para validar e pelo cliente para pintar).
 * Cada tema redefine os tokens `--color-game-*` (ver components/ui/game/game.css) e pode ter um cenário no topo.
 * Desbloqueio é só por nível (nível pela curva de lib/level.ts); o servidor confere antes de salvar.
 */
export type ThemeGroup = 'livre' | 'biblico' | 'desbloqueavel' | 'lofi';

export interface ThemeDef {
  id: string;
  name: string;
  group: ThemeGroup;
  /** Nível mínimo (só para `desbloqueavel`). */
  unlockLevel?: number;
  /** Tokens de cor. Em branco = usa o padrão do painel. */
  vars?: Partial<Record<'bg' | 'surface' | 'surface-2' | 'line' | 'ink' | 'ink-dim' | 'ink-on-light' | 'primary' | 'primary-deep' | 'secondary' | 'secondary-deep' | 'xp' | 'xp-track', string>>;
  blurb: string;
}

export const THEMES: readonly ThemeDef[] = [
  { id: 'padrao', name: 'Noite Azul', group: 'livre', blurb: 'O visual de sempre.' },
  { id: 'oceano', name: 'Oceano', group: 'livre',
    vars: { bg: '#06283d', surface: '#0b3b5a', 'surface-2': '#0f5280', line: '#2b7cab', 'xp-track': '#052237', primary: '#37d6e6', 'primary-deep': '#1597a6', secondary: '#7fb6ff', 'ink-on-light': '#06283d' }, blurb: 'Azul profundo e bichinhos do mar.' },
  { id: 'floresta', name: 'Floresta', group: 'livre',
    vars: { bg: '#0f2a1d', surface: '#17402b', 'surface-2': '#1f5a3b', line: '#3f8a5f', 'xp-track': '#0b1f15', primary: '#a3e635', 'primary-deep': '#65a30d', secondary: '#5eead4', 'ink-on-light': '#0f2a1d' }, blurb: 'Verde de mata, coruja e vaga-lume.' },
  { id: 'por-do-sol', name: 'Pôr do Sol', group: 'livre',
    vars: { bg: '#3a1236', surface: '#55193f', 'surface-2': '#7a2748', line: '#b44a5c', 'xp-track': '#2a0c27', primary: '#ff9f4a', 'primary-deep': '#c2681a', secondary: '#ff7eb6', 'ink-on-light': '#3a1236' }, blurb: 'Laranja e rosa do fim de tarde.' },
  { id: 'algodao', name: 'Algodão-doce', group: 'livre',
    vars: { bg: '#fdf2fb', surface: '#ffffff', 'surface-2': '#fce7f6', line: '#e9b6dc', ink: '#3b1a40', 'ink-dim': '#7a4d80', 'ink-on-light': '#3b1a40', 'xp-track': '#f3d3ec', primary: '#ec4899', 'primary-deep': '#be1c78', secondary: '#8b5cf6', 'secondary-deep': '#5b34c4' }, blurb: 'Claro e docinho, bom de dia.' },
  { id: 'espaco', name: 'Espaço', group: 'livre',
    vars: { bg: '#05060f', surface: '#0d1030', 'surface-2': '#171b4a', line: '#3a3f9a', 'xp-track': '#03040a', primary: '#8b8dff', 'primary-deep': '#4f51d1', secondary: '#22d3ee' }, blurb: 'Foguete, planetas e estrelas.' },

  { id: 'jardim-eden', name: 'Jardim do Éden', group: 'biblico',
    vars: { bg: '#12301a', surface: '#1d4a28', 'surface-2': '#286636', line: '#58a468', 'xp-track': '#0c2012', primary: '#f5c542', 'primary-deep': '#b8860b', secondary: '#f08a8a', 'ink-on-light': '#12301a' }, blurb: 'Árvores, frutas e passarinhos do início de tudo.' },
  { id: 'deserto-davi', name: 'Deserto de Davi', group: 'biblico',
    vars: { bg: '#3b2a14', surface: '#503819', 'surface-2': '#6b4c23', line: '#a77f43', 'xp-track': '#2a1d0d', primary: '#ffd36b', 'primary-deep': '#c28f1b', secondary: '#9bd1ff', 'ink-on-light': '#3b2a14' }, blurb: 'Areia, ovelhas e uma funda para Golias.' },
  { id: 'arca-noe', name: 'Arca de Noé', group: 'biblico',
    vars: { bg: '#1b2f4a', surface: '#26405f', 'surface-2': '#335680', line: '#5f8ab8', 'xp-track': '#122136', primary: '#ffb84d', 'primary-deep': '#c47a12', secondary: '#7ee0a6', 'ink-on-light': '#1b2f4a' }, blurb: 'Chuva, arco-íris e todos os bichos a bordo.' },

  { id: 'neon', name: 'Neon', group: 'desbloqueavel', unlockLevel: 2,
    vars: { bg: '#0a0a14', surface: '#141428', 'surface-2': '#1e1e40', line: '#ff2bd6', 'xp-track': '#06060d', primary: '#00f0ff', 'primary-deep': '#0098a3', secondary: '#ff2bd6', 'secondary-deep': '#a0108a', xp: '#7dffb3' }, blurb: 'Luzes de arcade acesas.' },
  { id: 'reino-ouro', name: 'Reino de Ouro', group: 'desbloqueavel', unlockLevel: 3,
    vars: { bg: '#2a1f05', surface: '#40300a', 'surface-2': '#5c4510', line: '#c99a00', 'xp-track': '#1c1403', primary: '#ffd23f', 'primary-deep': '#b8860b', secondary: '#fff3b0', 'ink-on-light': '#2a1f05' }, blurb: 'Coroa, castelo e tesouro.' },
  { id: 'aurora', name: 'Aurora', group: 'desbloqueavel', unlockLevel: 4,
    vars: { bg: '#071a2a', surface: '#0e3550', 'surface-2': '#154a6d', line: '#4fc3a1', 'xp-track': '#04111c', primary: '#6ee7b7', 'primary-deep': '#1fa97b', secondary: '#a78bfa', 'ink-on-light': '#071a2a' }, blurb: 'Luzes do norte dançando no céu.' },
  { id: 'galaxia', name: 'Galáxia Lendária', group: 'desbloqueavel', unlockLevel: 5,
    vars: { bg: '#12062a', surface: '#220d4d', 'surface-2': '#34167a', line: '#9b6bff', 'xp-track': '#0b0319', primary: '#ff8bd8', 'primary-deep': '#c23fa0', secondary: '#ffd23f', 'ink-on-light': '#12062a' }, blurb: 'O tema mais raro do painel.' },

  { id: 'lofi', name: 'Combina com meu Lofi', group: 'lofi',
    blurb: 'As cores do painel seguem a cor do seu Lofi.' },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME = 'padrao';

export function themeById(id: string | undefined | null): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function isThemeUnlocked(theme: ThemeDef, level: number): boolean {
  return theme.group !== 'desbloqueavel' || level >= (theme.unlockLevel ?? 1);
}

/** Efeito ao subir de nível. */
export const LEVEL_EFFECTS = [
  { id: 'estrelas', name: 'Chuva de estrelas', emoji: '⭐' },
  { id: 'confete', name: 'Confete colorido', emoji: '🎊' },
  { id: 'coracoes', name: 'Chuva de corações', emoji: '💛' },
  { id: 'nenhum', name: 'Sem efeito', emoji: '🚫' },
] as const;
export const LEVEL_EFFECT_IDS = LEVEL_EFFECTS.map((e) => e.id);

/** Som da conquista (subir de nível). */
export const ACHIEVEMENT_SOUNDS = [
  { id: 'classico', name: 'Clássico' },
  { id: 'sino', name: 'Sininho' },
  { id: 'fanfarra', name: 'Fanfarra' },
] as const;
export const ACHIEVEMENT_SOUND_IDS = ACHIEVEMENT_SOUNDS.map((s) => s.id);
