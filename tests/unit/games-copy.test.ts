import { describe, expect, test } from 'bun:test';
import { GAME_ALLOW, GAME_DENIED_FEATURES, myGameStatusView } from '../../components/student/games/copy';

describe('Jogos: isolamento e textos', () => {
  test('allow do iframe nega todos os recursos: cada item termina em \'none\' e nada fica liberado', () => {
    const items = GAME_ALLOW.split('; ');
    expect(items).toHaveLength(GAME_DENIED_FEATURES.length);
    for (const it of items) expect(it).toMatch(/^[a-z-]+ 'none'$/);
    for (const must of ['camera', 'microphone', 'geolocation', 'fullscreen', 'clipboard-read', 'payment', 'usb']) expect(GAME_ALLOW).toContain(`${must} 'none'`);
    expect(GAME_ALLOW).not.toContain('*');
    expect(GAME_ALLOW).not.toContain("'self'");
  });
  test('estado dos jogos enviados tem símbolo e texto', () => {
    expect(myGameStatusView('PENDING')).toEqual({ symbol: '⏳', label: 'Esperando revisão' });
    expect(myGameStatusView('REJECTED')).toEqual({ symbol: '✋', label: 'Não aprovado' });
    expect(myGameStatusView('APPROVED').label).toBe('Aprovado');
  });
});
