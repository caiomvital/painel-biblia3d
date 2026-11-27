import { describe, expect, test } from 'bun:test';
import { defaultPreferences, preferencesInput, readPreferences, passwordChangeInput } from '../../lib/panel-preferences';
import { reportFilters, toCsv } from '../../lib/report-data';

describe('Preferências e troca de senha', () => {
  test('preferências antigas usam padrões; nova entrada precisa ser válida', () => {
    expect(readPreferences(null)).toEqual(defaultPreferences);
    expect(readPreferences({ color: 'unknown', notifications: { AUCTION: false } }).notifications.AUCTION).toBe(false);
    expect(() => preferencesInput({ ...defaultPreferences, color: 'red' })).toThrow();
    expect(() => preferencesInput({ ...defaultPreferences, notifications: {} })).toThrow();
    expect(preferencesInput({ ...defaultPreferences, color: 'blue' }).color).toBe('blue');
  });
  test('troca exige senha atual, confirmação, tamanho seguro e senha diferente', () => {
    const valid = { currentPassword: 'senha123', newPassword: 'senha456', confirmPassword: 'senha456' };
    expect(passwordChangeInput(valid).newPassword).toBe(valid.newPassword);
    expect(() => passwordChangeInput({ ...valid, currentPassword: '' })).toThrow();
    expect(() => passwordChangeInput({ ...valid, confirmPassword: 'outra' })).toThrow();
    expect(() => passwordChangeInput({ ...valid, newPassword: 'abc1', confirmPassword: 'abc1' })).toThrow();
    expect(passwordChangeInput({ ...valid, newPassword: 'senha1234', confirmPassword: 'senha1234' }).newPassword).toBe('senha1234'); // sem limite máximo
    expect(() => passwordChangeInput({ ...valid, currentPassword: valid.newPassword })).toThrow();
  });
});
describe('Relatórios', () => {
  test('recusa datas inválidas, período invertido e limite fora da faixa', () => {
    for (const query of ['type=secret', 'from=2026-02-30', 'from=bad', 'from=2026-10-09&to=2026-10-01', 'threshold=101', 'threshold=NaN']) expect(() => reportFilters(new URLSearchParams(query))).toThrow();
    expect(reportFilters(new URLSearchParams('from=2026-10-01&to=2026-10-09')).to).toBe('2026-10-09');
  });
  test('CSV protege fórmulas e preserva aspas, linhas e números negativos', () => {
    const csv = toCsv(['Nome', 'Saldo'], [['=HYPERLINK("url")', -5], [' +formula', null], ['Nome; com "aspas"\ne linha', 2]]);
    expect(csv).toContain('"\'=HYPERLINK(""url"")"');
    expect(csv).toContain('"-5"');
    expect(csv).toContain('"\' +formula"');
    expect(csv).toContain('"Nome; com ""aspas""\ne linha"');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });
});
