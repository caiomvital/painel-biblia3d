/**
 * Sinais de que um jogo pode tentar abrir outra página dentro do próprio quadro
 * (o CSP não controla isso). Só serve de aviso ao diretor; a defesa real é o aviso no quadro do aluno.
 */
export function gameNavigationRisk(html: string): boolean {
  return /\blocation\b\s*(\.|=)|http-equiv\s*=\s*["']?refresh|(?:href|src|action)\s*=\s*["']?\s*(?:https?:)?\/\//i.test(html);
}
