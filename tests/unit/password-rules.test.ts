import { describe, expect, test } from "bun:test";
import { DEFAULT_KID_PASSWORD, MSG, directorResetData, firstPasswordProblem } from "@/lib/password-rules";
import { canonicalPhone, loginLimiterKey } from "@/lib/phone";
import { takeLoginAttempt } from "@/lib/login-limiter";

describe("senha nova do primeiro acesso", () => {
  const ctx = { phone: "81995474295", login: "aluno" };
  test("mínimo de 5 caracteres", () => {
    expect(firstPasswordProblem("abc1", ctx)).toBe(MSG.short);
    expect(firstPasswordProblem("", ctx)).toBe(MSG.short);
    expect(firstPasswordProblem("estrela7", ctx)).toBeNull();
    expect(firstPasswordProblem("abcdef1", ctx)).toBeNull(); // 5+ e não é sequência pura
    expect(firstPasswordProblem("abc12", ctx)).toBeNull(); // 5 letras ou números já vale
  });
  test("recusa 123 e as sequências óbvias pedidas", () => {
    for (const p of ["123", "123456", "111111", "000000", "654321"]) expect(firstPasswordProblem(p, ctx), p).not.toBeNull();
    expect(firstPasswordProblem(DEFAULT_KID_PASSWORD, ctx)).not.toBeNull();
  });
  test("recusa repetições e sequências parecidas", () => {
    for (const p of ["aaaaaa", "234567", "987654", "abcdef", "121212", "123123", "ABCDEF"]) expect(firstPasswordProblem(p, ctx), p).toBe(MSG.easy);
  });
  test("recusa o telefone, com ou sem formatação, com ou sem DDD", () => {
    for (const p of ["81995474295", "(81) 99547-4295", "81 99547 4295", "995474295", "99547-4295"]) expect(firstPasswordProblem(p, ctx), p).toBe(MSG.phone);
    expect(firstPasswordProblem("81995474296", ctx)).toBeNull(); // outro número
  });
  test("recusa o próprio login e senhas enormes", () => {
    expect(firstPasswordProblem("ALUNO1", { login: "aluno1" })).toBe(MSG.login);
    expect(firstPasswordProblem("x".repeat(201), ctx)).toBe(MSG.long);
  });
});

describe("telefone no limitador de login", () => {
  test("formato canônico é só dígitos", () => {
    expect(canonicalPhone("(81) 99547-4295")).toBe("81995474295");
  });
  test("três formas do mesmo telefone caem na mesma chave", () => {
    const keys = ["81995474295", "(81) 99547-4295", "81 99547 4295"].map(loginLimiterKey);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("81995474295");
  });
  test("e-mails e logins ficam como estão; telefones diferentes não se misturam", () => {
    expect(loginLimiterKey("aluno")).toBe("aluno");
    expect(loginLimiterKey("a@b.com")).toBe("a@b.com");
    expect(loginLimiterKey("81995474295")).not.toBe(loginLimiterKey("81995474296"));
  });
  test("as 10 tentativas valem juntas para as 3 formas (a 11ª, em qualquer forma, é barrada)", () => {
    const forms = ["81991110000", "(81) 99111-0000", "81 99111 0000"];
    for (let i = 0; i < 10; i++) expect(takeLoginAttempt(loginLimiterKey(forms[i % 3]))).toBe(true);
    for (const f of forms) expect(takeLoginAttempt(loginLimiterKey(f))).toBe(false);
  });
});

describe("redefinição pelo diretor", () => {
  test("liga de novo a troca obrigatória e encerra as sessões", () => {
    const data = directorResetData("hash");
    expect(data.mustChangePassword).toBe(true);
    expect(data.passwordHash).toBe("hash");
    expect(data.sessionVersion).toEqual({ increment: 1 });
  });
});

test("a senha padrão nova (tecnologia) não é aceita como senha da criança", () => {
  expect(DEFAULT_KID_PASSWORD).toBe("tecnologia");
  expect(firstPasswordProblem("tecnologia")).toBe(MSG.easy);
});
