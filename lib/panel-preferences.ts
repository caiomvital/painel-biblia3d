import { ACHIEVEMENT_SOUND_IDS, DEFAULT_THEME, LEVEL_EFFECT_IDS, THEME_IDS } from './game-themes';
export const panelColors = ['default', 'blue', 'green', 'violet'] as const;
export const textSizes = ['normal', 'large', 'larger'] as const;
export const notificationCategories = ['ACCOUNT', 'ACADEMIC', 'AUCTION'] as const;
export type Preferences = {
  color: typeof panelColors[number];
  textSize: typeof textSizes[number];
  /** Tema visual do painel do aluno (ver lib/game-themes.ts). */
  theme: string;
  levelEffect: string;
  achievementSound: string;
  notifications: Record<typeof notificationCategories[number], boolean>;
};
export const defaultPreferences: Preferences = {
  color: 'default', textSize: 'normal', theme: DEFAULT_THEME, levelEffect: 'estrelas', achievementSound: 'classico',
  notifications: { ACCOUNT: true, ACADEMIC: true, AUCTION: true },
};
export function readPreferences(value: unknown): Preferences {
  const data = value as Partial<Preferences> | null;
  return {
    color: panelColors.includes(data?.color as Preferences['color']) ? data!.color! : 'default',
    textSize: textSizes.includes(data?.textSize as Preferences['textSize']) ? data!.textSize! : 'normal',
    theme: THEME_IDS.includes(data?.theme as string) ? data!.theme! : DEFAULT_THEME,
    levelEffect: LEVEL_EFFECT_IDS.includes(data?.levelEffect as never) ? data!.levelEffect! : 'estrelas',
    achievementSound: ACHIEVEMENT_SOUND_IDS.includes(data?.achievementSound as never) ? data!.achievementSound! : 'classico',
    notifications: Object.fromEntries(notificationCategories.map(category => [category, typeof data?.notifications?.[category] === 'boolean' ? data.notifications[category] : true])) as Preferences['notifications'],
  };
}
export function preferencesInput(value: unknown): Preferences {
  const data = value as Preferences | null;
  if (!data || !panelColors.includes(data.color) || !textSizes.includes(data.textSize) ||
    !data.notifications || notificationCategories.some(category => typeof data.notifications[category] !== 'boolean')) {
    throw Object.assign(new Error('Preferências inválidas.'), { statusCode: 400 });
  }
  return readPreferences(data);
}
export function passwordChangeInput(value: unknown) {
  const data = value as Record<string, unknown> | null;
  if (!data || typeof data.currentPassword !== 'string' || !data.currentPassword || data.currentPassword.length > 1024)
    throw Object.assign(new Error('Informe sua senha atual.'), { statusCode: 400 });
  if (typeof data.newPassword !== 'string' || data.newPassword.length < 5 || data.newPassword.length > 200)
    throw Object.assign(new Error('A senha precisa ter 5 caracteres ou mais.'), { statusCode: 400 });
  if (data.newPassword !== data.confirmPassword)
    throw Object.assign(new Error('A confirmação da nova senha não corresponde.'), { statusCode: 400 });
  if (data.newPassword === data.currentPassword)
    throw Object.assign(new Error('Escolha uma senha diferente da atual.'), { statusCode: 400 });
  return { currentPassword: data.currentPassword, newPassword: data.newPassword };
}
