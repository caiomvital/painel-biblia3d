// Provision the operator's production director account. Defaults to a read-only plan.
import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../lib/database-config";
import { appOrigin, productionConfiguration } from "../lib/production-config";
import { inspectDatabaseSchema } from "./supabase-schema";

const APPROVED_HML_ORIGIN = "https://fuctura-hml.69.169.102.111.sslip.io";
type Endpoint = { host: string; port: string; user: string; database: string; project?: string };

function endpoint(raw: string): Endpoint {
  const url = new URL(databaseUrl(raw));
  if (url.searchParams.has("host") || (url.searchParams.get("schema") ?? "public") !== "public") {
    throw new Error("Database URL must use the public schema and must not override its host.");
  }
  const directProject = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname)?.[1];
  const poolProject = url.hostname.endsWith(".pooler.supabase.com")
    ? /\.([a-z0-9]{20})$/.exec(decodeURIComponent(url.username))?.[1]
    : undefined;
  return {
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    database: decodeURIComponent(url.pathname.slice(1)),
    project: directProject ?? poolProject,
  };
}

function targetFingerprint(origin: string, runtime: Endpoint, direct: Endpoint): string {
  const sameDatabase = runtime.project && direct.project
    ? runtime.project === direct.project && runtime.database === direct.database
    : !runtime.project && !direct.project && runtime.host === direct.host &&
      runtime.port === direct.port && runtime.user === direct.user && runtime.database === direct.database;
  if (!sameDatabase) throw new Error("DATABASE_URL and DIRECT_URL do not identify the same database.");
  const stableTarget = runtime.project
    ? { origin, project: runtime.project, database: runtime.database }
    : { origin, host: runtime.host, user: runtime.user, database: runtime.database };
  return createHash("sha256").update(JSON.stringify(stableTarget)).digest("hex");
}

function assertProductionTarget(allowHmlOrigin: boolean) {
  if (process.env.NODE_ENV !== "production" ||
      (process.env.APP_ENV && process.env.APP_ENV !== "production")) {
    throw new Error("Run this command only with production runtime configuration.");
  }
  productionConfiguration();
  const origin = appOrigin(process.env.APP_URL, true)!;
  const hostname = new URL(origin).hostname.toLowerCase();
  const stagingNamed = /hml|staging|homolog|dev\.|localhost|\.local$|sslip\.io|\.example$|replace/.test(hostname);
  if (stagingNamed && !(allowHmlOrigin && origin === APPROVED_HML_ORIGIN)) {
    throw new Error("This staging or temporary origin requires the explicit --allow-hml-origin flag.");
  }
  if (allowHmlOrigin && origin !== APPROVED_HML_ORIGIN) {
    throw new Error("--allow-hml-origin is restricted to the documented homologation origin.");
  }
  const runtime = endpoint(process.env.DATABASE_URL!);
  const direct = endpoint(process.env.DIRECT_URL!);
  if ([runtime.host, direct.host].some((host) => ["localhost", "127.0.0.1", "::1"].includes(host))) {
    throw new Error("Production database URLs must point to the configured remote database.");
  }
  return { origin, target: targetFingerprint(origin, runtime, direct) };
}

function validateEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
    throw new Error("Director email is invalid.");
  }
  return value;
}

async function readEmail() {
  if (process.env.DIRECTOR_EMAIL) return validateEmail(process.env.DIRECTOR_EMAIL);
  if (!stdin.isTTY) throw new Error("Set DIRECTOR_EMAIL or run from an interactive terminal.");
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return validateEmail(await rl.question("Director email: "));
  } finally {
    rl.close();
  }
}

async function inspectTarget(url: string, email: string) {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl(url) } }, log: [] });
  try {
    return await client.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '10000ms'`;
      const schema = await inspectDatabaseSchema(tx);
      if (schema.differences.length || schema.pendingMigrations.length || !schema.migrationHistoryVerified) {
        throw new Error("Database schema or migration history is not ready.");
      }
      const [directors, account] = await Promise.all([
        tx.user.count({ where: { role: "DIRETOR" } }),
        tx.user.findUnique({ where: { email }, select: { role: true, director: { select: { id: true } } } }),
      ]);
      return {
        directors,
        accountRole: account?.role ?? null,
        hasDirectorProfile: Boolean(account?.director),
      };
    }, { timeout: 30000, maxWait: 5000 });
  } finally {
    await client.$disconnect();
  }
}

async function hiddenPassword(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("A real terminal is required so the password is not echoed or passed in command arguments.");
  }
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  return await new Promise<string>((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (chunk: Buffer | string) => {
      for (const character of String(chunk)) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " ") value += character;
      }
    };
    stdin.on("data", onData);
  });
}

async function promptAccount(email: string, create: boolean) {
  let name = "";
  if (create) {
    if (!stdin.isTTY) throw new Error("A real terminal is required for account creation.");
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      name = (await rl.question("Director name: ")).trim();
    } finally {
      rl.close();
    }
    if (!name || name.length > 120) throw new Error("Director name is invalid.");
  }
  const password = await hiddenPassword("New password (6–8 characters): ");
  const confirmation = await hiddenPassword("Repeat new password: ");
  if (password !== confirmation || password.length < 6 ||
      password.length > 8 || password.startsWith("REPLACE_") ||
      password === "Password123!" || password === process.env.AUTH_SECRET) {
    throw new Error("Passwords must match, contain 6–8 characters, and be unique to this account.");
  }
  return { email, name, password };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const allowHmlOrigin = args.includes("--allow-hml-origin");
  if (args.some((arg) => !["--apply", "--allow-hml-origin"].includes(arg) &&
      !/^--confirm=PROVISION_DIRECTOR:[a-f0-9]{64}$/.test(arg))) {
    throw new Error("Usage: npm run provision:production-director [--allow-hml-origin] [--apply --confirm=PROVISION_DIRECTOR:<target-sha256>]");
  }

  const email = await readEmail();
  const { origin, target } = assertProductionTarget(allowHmlOrigin);
  const [runtime, direct] = await Promise.all([
    inspectTarget(process.env.DATABASE_URL!, email),
    inspectTarget(process.env.DIRECT_URL!, email),
  ]);
  if (runtime.directors !== direct.directors || runtime.accountRole !== direct.accountRole ||
      runtime.hasDirectorProfile !== direct.hasDirectorProfile) {
    throw new Error("Runtime and direct database routes disagree.");
  }
  if (runtime.accountRole && runtime.accountRole !== "DIRETOR") {
    throw new Error("This email already belongs to a non-director account; no role changes are allowed.");
  }
  if (runtime.accountRole === "DIRETOR" && !runtime.hasDirectorProfile) {
    throw new Error("This director account has no Director profile; repair it before changing its password.");
  }
  const create = runtime.accountRole === null;
  const action = create ? "create_director" : "reset_director_password";

  if (!apply) {
    console.log(JSON.stringify({ mode: "plan", action, origin, targetSha256: target,
      existingDirectors: runtime.directors, emailHasDirectorAccount: !create }));
    console.log(`After reviewing the target, rerun with --apply --confirm=PROVISION_DIRECTOR:${target}${allowHmlOrigin ? " --allow-hml-origin" : ""}`);
    return;
  }
  if (!args.includes(`--confirm=PROVISION_DIRECTOR:${target}`)) {
    throw new Error("Target confirmation does not match the current origin and database.");
  }

  const account = await promptAccount(email, create);
  try {
    const passwordHash = await hash(account.password, 10);
    const db = new PrismaClient({ datasources: { db: { url: databaseUrl(process.env.DIRECT_URL!) } }, log: [] });
    try {
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(810230421)`;
        const existing = await tx.user.findUnique({
          where: { email },
          select: { id: true, role: true, director: { select: { id: true } } },
        });
        if (create && existing) throw new Error("Account changed after plan; no changes made.");
        if (!create && (existing?.role !== "DIRETOR" || !existing.director)) {
          throw new Error("Director account changed after plan; no changes made.");
        }
        if (existing) {
          await tx.user.update({
            where: { id: existing.id },
            data: { passwordHash, sessionVersion: { increment: 1 } },
            select: { id: true },
          });
        } else {
          await tx.user.create({
            data: {
              email,
              name: account.name,
              role: "DIRETOR",
              passwordHash,
              profile: { create: {} },
              director: { create: {} },
            },
            select: { id: true },
          });
        }
      }, { timeout: 30000, maxWait: 5000 });
    } finally {
      await db.$disconnect();
    }
  } finally {
    account.password = "";
  }
  console.log(JSON.stringify({ completed: action, role: "DIRETOR", origin, targetSha256: target }));
  console.log("Store the password in your password manager. This command will not display or save it.");
}

main().catch(() => {
  console.error("Operation stopped. No password or database details were written to the log; inspect the target before retrying.");
  process.exitCode = 1;
});
