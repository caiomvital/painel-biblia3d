/** Telefone no formato canônico do cadastro: só dígitos (ex.: 81995474295). */
export const canonicalPhone = (value: string) => value.replace(/\D/g, "");

/**
 * Chave do limitador de tentativas de login. Telefones (10 ou 11 dígitos, com ou sem
 * espaços, parênteses e traços) caem todos na mesma chave canônica; e-mails/logins ficam como estão.
 */
export function loginLimiterKey(normalizedLogin: string): string {
  const phone = normalizedLogin.replace(/[\s().-]/g, "");
  return /^\d{10,11}$/.test(phone) ? phone : normalizedLogin;
}
