/** Textos de data dos eventos, sempre no horário de Recife (o aparelho pode estar em outro fuso). */
const TZ = 'America/Recife';

export function eventWhen(iso: string): { day: string; time: string; weekday: string; dayNumber: string; month: string } {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...o }).format(d);
  return {
    weekday: f({ weekday: 'long' }), dayNumber: f({ day: '2-digit' }), month: f({ month: 'short' }).replace('.', ''),
    day: f({ day: '2-digit', month: '2-digit' }), time: f({ hour: '2-digit', minute: '2-digit' }).replace(':00', 'h').replace(':', 'h'),
  };
}

/** "Hoje", "Amanhã", "Em 3 dias" ou "Agora". */
export function eventCountdown(iso: string, now = new Date()): string {
  const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  const start = new Date(iso);
  if (now.getTime() >= start.getTime() && now.getTime() - start.getTime() < 3 * 3600 * 1000) return 'Agora';
  const diff = Math.round((Date.parse(dayKey(start)) - Date.parse(dayKey(now))) / 86400000);
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `Em ${diff} dias`;
}
