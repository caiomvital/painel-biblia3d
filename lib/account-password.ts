import { hash } from "bcryptjs";
import { MAX_PASSWORD } from "./password-rules";
export async function initialPasswordHash(
  password?: string,
  production = process.env.NODE_ENV === "production",
) {
  if (!password && !production) return hash("Password123!", 10); // legacy development-only fixtures
  if (
    typeof password !== "string" ||
    password.length < 5 ||
    password.length > MAX_PASSWORD
  )
    throw new Error("A senha inicial precisa ter 5 caracteres ou mais.");
  return hash(password, 10);
}
