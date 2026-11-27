/**
 * Easter eggs do painel infantil (só diversão: nenhum deles mexe em pontos, fichas ou banco de dados).
 * Funções puras, para poder testar sem tela.
 */

/** Ranking secreto: o título que o aluno ganha conforme o nível. Do nível 10 em diante é sempre o último. */
const LEVEL_TITLES = [
  'Aprendiz',
  'Explorador',
  'Escriba',
  'Construtor de Sites',
  'Guardião do Código',
  'Mestre das Páginas',
  'Trombeteiro de Jericó',
  'Arquiteto da Web',
  'Sábio do Código',
  'Lenda da Arca',
] as const;

export function levelTitle(level: number): string {
  const n = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return LEVEL_TITLES[Math.min(n, LEVEL_TITLES.length) - 1];
}

/** Título do próximo nível, ou null quando o aluno já está no último. */
export function nextLevelTitle(level: number): string | null {
  const n = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return n >= LEVEL_TITLES.length ? null : LEVEL_TITLES[n];
}

/** Piadas do Davi (curtas, sem números nem versículo decorado, para nunca citar errado). */
export const DAVI_JOKES = [
  'O que o HTML disse para o CSS? "Sem você eu fico sem graça!"',
  'Por que o Noé nunca perdeu um e-mail? Porque tinha uma arca de entrada!',
  'Qual é o café favorito do programador? O Java!',
  'O que o Josué fazia quando o site não carregava? Dava voltas até ele cair... quer dizer, carregar!',
  'Por que o computador foi ao médico? Porque estava com um vírus!',
  'Eu era bom de mira com a funda. Hoje, só clico no alvo certo!',
] as const;

/** A piada da vez (volta ao começo quando acabam). */
export function daviJoke(turn: number): string {
  const n = Number.isFinite(turn) ? Math.max(0, Math.floor(turn)) : 0;
  return DAVI_JOKES[n % DAVI_JOKES.length];
}

/**
 * Contador de toques seguidos: devolve true quando o aluno completa `threshold` toques,
 * cada um a no máximo `maxGapMs` do anterior. Depois de acertar, recomeça do zero.
 */
export function createTapCounter(threshold: number, maxGapMs: number, now: () => number = Date.now) {
  let count = 0;
  let last = 0;
  return function tap(): boolean {
    const t = now();
    count = last && t - last <= maxGapMs ? count + 1 : 1;
    last = t;
    if (count >= threshold) {
      count = 0;
      last = 0;
      return true;
    }
    return false;
  };
}
