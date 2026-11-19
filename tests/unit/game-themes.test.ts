import { describe, expect, test } from 'bun:test';
import { THEMES, isThemeUnlocked, themeById } from '../../lib/game-themes';
import { defaultPreferences, preferencesInput, readPreferences } from '../../lib/panel-preferences';

describe('temas do painel do aluno', () => {
  test('catálogo: 6 livres + Lofi, 3 bíblicos e 4 desbloqueáveis com nível', () => {
    expect(THEMES.filter((t) => t.group === 'livre')).toHaveLength(6);
    expect(THEMES.filter((t) => t.group === 'biblico')).toHaveLength(3);
    const locked = THEMES.filter((t) => t.group === 'desbloqueavel');
    expect(locked).toHaveLength(4);
    expect(locked.every((t) => (t.unlockLevel ?? 0) >= 2)).toBe(true);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  test('desbloqueio por nível', () => {
    const reino = themeById('reino-ouro');
    expect(isThemeUnlocked(reino, 2)).toBe(false);
    expect(isThemeUnlocked(reino, 3)).toBe(true);
    expect(isThemeUnlocked(themeById('oceano'), 1)).toBe(true);
  });

  test('preferências: tema desconhecido volta ao padrão e contas antigas continuam válidas', () => {
    expect(readPreferences({ theme: 'hacker' }).theme).toBe('padrao');
    expect(readPreferences({ theme: 'arca-noe' }).theme).toBe('arca-noe');
    const antigo = { color: 'blue', textSize: 'normal', notifications: defaultPreferences.notifications };
    expect(preferencesInput(antigo).theme).toBe('padrao');
  });
});
