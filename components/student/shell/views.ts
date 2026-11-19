import type { StudentTab } from '../student-types';

export type View =
  | 'home' | 'quests' | 'auction' | 'games' | 'profile' // abas da barra inferior
  | 'ranking' | 'badges' // atalhos laterais da tela inicial
  | 'wardrobe' | 'themes' // Meu Lofi e coleção, em Perfil
  | 'overview' | 'lessons' | 'exercises' | 'curriculum'; // telas herdadas, em Perfil > Mais

/** Qual aba da barra inferior fica marcada para cada tela. */
export function parentTab(view: View): 'home' | 'quests' | 'auction' | 'games' | 'profile' {
  if (view === 'ranking' || view === 'badges') return 'home';
  if (view === 'wardrobe' || view === 'themes') return 'profile';
  if (view === 'overview' || view === 'lessons' || view === 'exercises' || view === 'curriculum') return 'profile';
  return view;
}

/** Converte os nomes de aba antigos (StudentTab) para as telas novas. */
export function viewFromLegacyTab(tab: StudentTab): View {
  return tab === 'kids' ? 'home' : tab;
}

/** Destino do evento global panel:navigate (mesmo contrato de antes: detail.target). */
export function viewFromPanelTarget(target: string): View {
  if (target === 'auction') return 'auction';
  if (target === 'lessons' || target === 'attendance') return 'lessons';
  return 'overview';
}
