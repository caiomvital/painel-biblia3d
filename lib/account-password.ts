import { hash } from "bcryptjs";
export async function initialPasswordHash(
  password?: string,
  production = process.env.NODE_ENV === "production",
) {
  if (!password && !production) return hash("Password123!", 10); // legacy development-only fixtures
  if (
    typeof password !== "string" ||
    password.length < 6 ||
    password.length > 8
  )
    throw new Error("Informe uma senha inicial de 6 a 8 caracteres.");
  return hash(password, 10);
}
