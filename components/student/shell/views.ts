export type View =
  | 'home' | 'quests' | 'auction' | 'games' | 'profile' // abas da barra inferior
  | 'day' | 'learned' | 'live' // botões da tela inicial
  | 'events' | 'ranking' // atalho do menu de três pontinhos
  | 'wardrobe' | 'themes'; // Meu Lofi e coleção, em Perfil

/** Qual aba da barra inferior fica marcada para cada tela. */
export function parentTab(view: View): 'home' | 'quests' | 'auction' | 'games' | 'profile' {
  if (view === 'ranking' || view === 'events' || view === 'day' || view === 'learned' || view === 'live') return 'home';
  if (view === 'wardrobe' || view === 'themes') return 'profile';
  return view;
}

/** Destino do evento global panel:navigate (mesmo contrato de antes: detail.target). */
export function viewFromPanelTarget(target: string): View {
  if (target === 'auction') return 'auction';
  return 'home';
}
