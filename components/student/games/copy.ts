/** Textos e regras de apresentação dos Jogos (curtos, para crianças de 6 a 13 anos). */
export const GAMES_TEXT = {
  title: 'Jogos',
  intro: 'Jogue os jogos da turma e crie o seu!',
  empty: 'Ainda não há jogos. Que tal criar o primeiro?',
  loading: 'Carregando…',
  play: 'Jogar',
  back: 'Voltar',
  opening: 'Abrindo o jogo…',
  slow: 'O jogo está demorando para abrir.',
  retry: 'Tentar de novo',
  navigated: 'O jogo recarregou. Tentar de novo?',
  mine: 'Meus jogos',
  others: 'Jogos dos colegas',
  makePublic: 'Tornar público',
  makePublicHelp: 'Os colegas poderão jogar. A equipe confere antes de aparecer para todos.',
  makePrivate: 'Deixar só meu',
  sentPrivate: 'Jogo guardado! Só você vê. Marque "Tornar público" quando quiser mostrar aos colegas.',
  send: 'Enviar um jogo meu',
  sendHelp: 'Seu jogo é um arquivo HTML. Peça ajuda ao professor.',
  sent: 'Jogo enviado! Quando a equipe aprovar, ele aparece para todos.',
} as const;

/**
 * Recursos do navegador que o jogo NÃO pode usar (atributo allow do iframe, "negando tudo").
 * Se algum jogo precisar de som, é só tirar `autoplay` daqui: a decisão é do Caio.
 */
export const GAME_DENIED_FEATURES = [
  'accelerometer', 'ambient-light-sensor', 'autoplay', 'battery', 'bluetooth', 'camera', 'clipboard-read',
  'clipboard-write', 'display-capture', 'document-domain', 'encrypted-media', 'fullscreen', 'gamepad',
  'geolocation', 'gyroscope', 'hid', 'idle-detection', 'local-fonts', 'magnetometer', 'microphone', 'midi',
  'payment', 'picture-in-picture', 'publickey-credentials-get', 'screen-wake-lock', 'serial',
  'speaker-selection', 'sync-xhr', 'usb', 'web-share', 'window-management', 'xr-spatial-tracking',
] as const;

export const GAME_ALLOW = GAME_DENIED_FEATURES.map((f) => `${f} 'none'`).join('; ');

export type MyGameStatus = 'PENDING' | 'REJECTED' | string;

/** Estado de um jogo enviado: símbolo + texto (nunca só cor). */
export function myGameStatusView(status: MyGameStatus, isPublic = true): { symbol: string; label: string } {
  if (!isPublic) return { symbol: '🔒', label: 'Só meu' };
  if (status === 'PENDING') return { symbol: '⏳', label: 'Esperando revisão' };
  if (status === 'REJECTED') return { symbol: '✋', label: 'Não aprovado' };
  return { symbol: '🌎', label: 'Público' };
}
