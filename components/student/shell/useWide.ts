import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1024px)';
function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
/** true em tela larga (computador). No servidor e na primeira pintura é false (layout de celular). */
export function useWide() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
