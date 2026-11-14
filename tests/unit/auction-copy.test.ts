import { describe, expect, test } from 'bun:test';
import { bidStatusView, countdownText, describeWindow, friendlyBidError, howLines, itemEmoji, leaderLabel, windowNoticeText } from '../../components/student/auction/copy';

describe('Leilão para crianças: textos e estados', () => {
  test('cada estado tem símbolo e texto (nunca só cor)', () => {
    expect(bidStatusView('LIDERANDO')).toMatchObject({ symbol: '↑', label: 'Vencendo' });
    expect(bidStatusView('SUPERADO')).toMatchObject({ symbol: '↓', label: 'Superado' });
    expect(bidStatusView('ARREMATADO')).toMatchObject({ symbol: '★', label: 'Ganhou!' });
    expect(bidStatusView('ENCERRADO')).toMatchObject({ symbol: '■', label: 'Encerrado' });
    for (const s of ['LIDERANDO', 'SUPERADO', 'ARREMATADO', 'ENCERRADO'] as const) {
      const v = bidStatusView(s);
      expect(v.symbol.length).toBeGreaterThan(0);
      expect(v.label.split(' ').length).toBeLessThanOrEqual(2); // rótulos de até duas palavras
    }
  });
  test('quem lidera: Você / Outro aluno / Sem lances', () => {
    expect(leaderLabel(true, 'Você')).toBe('Você');
    expect(leaderLabel(false, 'Outro aluno')).toBe('Outro aluno');
    expect(leaderLabel(false, 'Sem lances')).toBe('Sem lances');
    expect(leaderLabel(false, 'Rodrigo Oliveira')).toBe('Outro aluno'); // defesa: nunca mostra nome
  });
  test('tempo restante em texto curto', () => {
    expect(countdownText(0)).toBe('Encerrado');
    expect(countdownText(59)).toBe('1min');
    expect(countdownText(125 * 60)).toBe('2h 5min');
    expect(countdownText(2 * 86400 + 3 * 3600)).toBe('2d 3h');
  });
  test('ícone de prêmio com padrão', () => {
    expect(itemEmoji('headphone')).toBe('🎧');
    expect(itemEmoji('qualquer')).toBe('🎁');
  });
  test('texto da janela informa abertura e fechamento', () => {
    const w = { open: false, opensAt: '19:00', closesAt: '00:00' };
    expect(describeWindow(w)).toBe('Lances das 19h até meia-noite');
    expect(windowNoticeText(w)).toBe('Fechado agora. Lances das 19h até meia-noite.');
    expect(windowNoticeText({ ...w, open: true })).toBe('Aberto agora! Lances até meia-noite.');
    expect(howLines(w)[0]).toBe('Lances das 19h até meia-noite.');
    expect(howLines(null)).toHaveLength(3);
  });
  test('mensagens do servidor trocam "Coins" por "fichas" (só na tela)', () => {
    expect(friendlyBidError('O lance mínimo deve ser de pelo menos 150 Coins.')).toBe('O lance mínimo deve ser de pelo menos 150 fichas.');
    expect(friendlyBidError('Saldo insuficiente.')).toBe('Saldo insuficiente.');
  });
});
