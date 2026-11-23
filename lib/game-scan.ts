/**
 * Varredura automática do código de um jogo (HTML em um arquivo só) antes de aceitar o envio.
 * O jogo já roda isolado (sandbox sem same-origin e CSP sem rede); esta checagem é a segunda trava:
 * recusa o que não precisa existir num jogo simples e que costuma aparecer em código malicioso.
 */
import { isProbeGame, probeGamesAllowed } from '@/lib/probe-guard';

export type GameScan = { ok: boolean; problems: string[] };

const RULES: { re: RegExp; label: string }[] = [
  { re: /<\s*(iframe|frame|frameset|object|embed|applet)\b/i, label: 'quadros ou objetos embutidos (iframe, object, embed)' },
  { re: /<\s*form\b/i, label: 'formulários' },
  { re: /<\s*base\b/i, label: 'a tag base' },
  { re: /<\s*meta[^>]+http-equiv\s*=\s*["']?\s*(refresh|set-cookie|content-security-policy)/i, label: 'meta que redireciona ou muda regras de segurança' },
  { re: /<\s*script[^>]+\bsrc\s*=/i, label: 'script carregado de outro arquivo ou endereço' },
  { re: /<\s*link[^>]+\bhref\s*=/i, label: 'arquivo externo (link)' },
  { re: /\b(?:href|src|action|formaction|poster|data)\s*=\s*["']?\s*(?:https?:)?\/\//i, label: 'endereço externo (http ou //)' },
  { re: /url\(\s*["']?\s*(?:https?:)?\/\//i, label: 'imagem ou fonte de endereço externo' },
  { re: /@import\b/i, label: '@import de CSS' },
  { re: /\b(?:javascript|vbscript)\s*:/i, label: 'endereço javascript:' },
  { re: /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bsendBeacon\b|\bimportScripts\b|\bnew\s+Worker\b|\bSharedWorker\b|\bserviceWorker\b/i, label: 'acesso à rede ou a processos em segundo plano' },
  { re: /\beval\s*\(|\bnew\s+Function\b|\b(?:setTimeout|setInterval)\s*\(\s*["'`]/i, label: 'código montado em texto (eval, new Function)' },
  { re: /\bimport\s*\(|^\s*import\s.+from\s/m, label: 'importação de módulos' },
  { re: /\blocation\b\s*(?:=(?!=)|\[|\.\s*(?:href|assign|replace|hash|host|hostname|search|pathname|origin|protocol)\b)|\b(?:window|self)\s*\.\s*(?:top|parent|opener|open)\b|\btop\s*\.\s*location|\bdocument\s*\.\s*(?:cookie|domain)\b/i, label: 'tentativa de sair do quadro, trocar de página ou ler cookies' },
  { re: /\bnavigator\s*\.\s*(?:clipboard|geolocation|mediaDevices|credentials|sendBeacon)\b/i, label: 'acesso ao armazenamento ou a recursos do aparelho' },
  { re: /\bpostMessage\s*\(/i, label: 'envio de mensagens para a página do painel' },
];

export function scanGameHtml(html: string): GameScan {
  // Jogos de sonda (testes de segurança do isolamento) só existem em e2e local: a trava de probe-guard decide.
  if (isProbeGame(html) && probeGamesAllowed()) return { ok: true, problems: [] };
  const problems = RULES.filter((r) => r.re.test(html)).map((r) => r.label);
  return { ok: problems.length === 0, problems };
}

/** Mensagem pronta para mostrar a quem enviou. */
export function scanMessage(scan: GameScan): string {
  return `Esse jogo não pôde ser aceito porque usa: ${scan.problems.join('; ')}. Tire isso do código e envie de novo.`;
}
