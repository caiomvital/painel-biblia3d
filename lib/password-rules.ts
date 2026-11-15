/** Regras da senha que a criança cria no primeiro acesso. Mensagens curtas e amigáveis. */
export const MSG = {
  short: "A senha precisa ter pelo menos 6 letras ou números.",
  long: "Use no máximo 32 letras ou números.",
  easy: "Essa senha é fácil de adivinhar. Escolha outra!",
  phone: "A senha não pode ser o telefone. Escolha outra!",
  login: "A senha não pode ser igual ao seu login. Escolha outra!",
  same: "Escolha uma senha diferente da antiga.",
} as const;

const BLOCKED = new Set(["123", "123456", "111111", "000000", "654321", "12345678", "1234567", "senha", "senha1", "123abc", "abc123"]);

function isRun(text: string): boolean {
  if (text.length < 4) return false;
  let up = true;
  let down = true;
  for (let i = 1; i < text.length; i++) {
    const d = text.charCodeAt(i) - text.charCodeAt(i - 1);
    if (d !== 1) up = false;
    if (d !== -1) down = false;
  }
  return up || down;
}

function isRepeatedPattern(text: string): boolean {
  for (let size = 1; size <= 3; size++) {
    if (text.length >= size * 2 && text.length % size === 0 && text === text.slice(0, size).repeat(text.length / size)) return true;
  }
  return false;
}

export interface PasswordContext {
  /** Telefone do responsável (login da criança). */
  phone?: string | null;
  /** Login da conta (ex.: "aluno"). */
  login?: string | null;
}

/** Devolve a mensagem do problema, ou null se a senha nova é aceitável. */
export function firstPasswordProblem(password: string, ctx: PasswordContext = {}): string | null {
  if (password.length < 6) return MSG.short;
  if (password.length > 32) return MSG.long;
  const lower = password.toLowerCase();
  if (BLOCKED.has(lower) || isRun(lower) || isRepeatedPattern(lower)) return MSG.easy;
  const digits = password.replace(/\D/g, "");
  const phone = (ctx.phone ?? "").replace(/\D/g, "");
  if (phone && digits.length >= 8 && (digits === phone || digits === phone.slice(-9) || digits === phone.slice(-8))) return MSG.phone;
  if (ctx.login && lower === ctx.login.trim().toLowerCase()) return MSG.login;
  return null;
}

/** Senha padrão de aluno (cadastro pelo diretor e redefinição). Nunca é aceita como senha nova. */
export const DEFAULT_KID_PASSWORD = "123";

/** Dados gravados quando o diretor redefine a senha de um aluno: volta ao padrão E exige nova troca. */
export function directorResetData(passwordHash: string) {
  return { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } } as const;
}
