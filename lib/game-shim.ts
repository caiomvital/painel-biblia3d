/**
 * Aviso amigável para jogos que usam recursos que o isolamento bloqueia: alert/confirm/prompt
 * (sem allow-modals) e eval (sem 'unsafe-eval'). Sem isso o jogo simplesmente "não faz nada".
 *
 * É um script mínimo, injetado ANTES do código do jogo, só dentro do iframe isolado. Para desligar a
 * injeção sem mexer em mais nada, troque GAME_SHIM_ENABLED por false.
 */
export const GAME_SHIM_ENABLED = true;

const SHIM_BODY = [
  '(function(){var box;',
  'function say(m){try{if(!box){box=document.createElement("div");box.setAttribute("role","alert");',
  'box.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;padding:12px 14px;border-radius:14px;background:#221d52;color:#fff;font:600 16px/1.3 system-ui,sans-serif;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.5)"}',
  'box.textContent=m;(document.body||document.documentElement).appendChild(box);clearTimeout(box.t);',
  'box.t=setTimeout(function(){if(box.parentNode)box.parentNode.removeChild(box)},6000)}catch(e){}}',
  'var A="Este jogo tentou abrir um aviso do navegador. Aqui dentro isso n\u00e3o funciona.";',
  'window.alert=function(){say(A)};window.confirm=function(){say(A);return false};window.prompt=function(){say(A);return null};',
  'var E="Ops! Este jogo usa um recurso que n\u00e3o funciona aqui.";',
  'document.addEventListener("securitypolicyviolation",function(e){if(e.blockedURI==="eval")say(E)},true);',
  'window.addEventListener("error",function(e){if(/unsafe-eval|EvalError/.test(String(e&&e.message)))say(E)});})();',
].join('');

export const SHIM_TAG = `<script data-b3d-shim>${SHIM_BODY}</script>`;

/** Insere o aviso depois de <head>, senão <body>, senão <html>, senão depois do doctype; nunca antes do doctype. */
export function injectGameShim(html: string, enabled: boolean = GAME_SHIM_ENABLED): string {
  if (!enabled || html.includes('data-b3d-shim')) return html;
  const doctype = /<!doctype[^>]*>/i.exec(html);
  const start = doctype ? doctype.index + doctype[0].length : 0;
  const rest = html.slice(start);
  for (const tag of [/<head(\s[^>]*)?>/i, /<body(\s[^>]*)?>/i, /<html(\s[^>]*)?>/i]) {
    const m = tag.exec(rest);
    if (m) {
      const at = start + m.index + m[0].length;
      return html.slice(0, at) + SHIM_TAG + html.slice(at);
    }
  }
  return html.slice(0, start) + SHIM_TAG + html.slice(start);
}
