import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, openSync, readFileSync, closeSync, statSync, writeFileSync } from "node:fs";
import { open, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

// Origem aprovada vem do ambiente; sem ela o script recusa (nunca fixe IP/domínio no código).
const ORIGIN = process.env.APPROVED_ORIGIN || "https://<HOST_DE_HOMOLOGACAO>";
const CONTAINER = "fuctura-productivity-tests";
const LOCAL_DB_USER = "fuctura_test";
const BACKUP_DIR = "/var/backups/fuctura";
const KEY_PATH = "/etc/fuctura/backup.key";
const HEADER = Buffer.from("FUCTURA-DB-BACKUP-V1\n", "ascii");
const EXPECTED_MIGRATION = "20261011_secretary_role";

function fail(message) { throw new Error(message); }

function databaseTarget(raw) {
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname === "/") {
    fail("Database URL is invalid.");
  }
  const directProject = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname)?.[1];
  const poolProject = url.hostname.endsWith(".pooler.supabase.com")
    ? /\.([a-z0-9]{20})$/.exec(decodeURIComponent(url.username))?.[1]
    : undefined;
  const project = directProject ?? poolProject;
  if (!project) fail("The configured database is not a recognized Supabase project.");
  return {
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    project,
  };
}

function readKey() {
  if (process.getuid?.() !== 0) fail("Run this backup command as root so the encryption key stays protected.");
  if (!existsSync("/etc/fuctura")) mkdirSync("/etc/fuctura", { mode: 0o700 });
  const keyDirectory = statSync("/etc/fuctura");
  if (!keyDirectory.isDirectory() || keyDirectory.uid !== 0 || (keyDirectory.mode & 0o077) !== 0) {
    fail("The backup key directory must be root-owned and private (mode 0700).");
  }
  if (!existsSync(KEY_PATH)) {
    const key = randomBytes(32).toString("base64");
    const fd = openSync(KEY_PATH, "wx", 0o600);
    try { writeFileSync(fd, `${key}\n`); } finally { closeSync(fd); }
  }
  const info = statSync(KEY_PATH);
  if (info.uid !== 0 || (info.mode & 0o077) !== 0 || !info.isFile()) {
    fail("The backup encryption key must be a root-owned regular file with mode 0600 or stricter.");
  }
  const raw = readFileSync(KEY_PATH, "utf8").trim();
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) fail("The protected backup encryption key is invalid.");
  return key;
}

function limitedEnv(extra = {}) {
  return {
    PATH: process.env.PATH || "/usr/bin:/bin",
    HOME: "/root",
    LANG: "C.UTF-8",
    ...extra,
  };
}

function spawnQuiet(command, args, options = {}) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-2000); });
  return { child, stderr: () => stderr };
}

async function waitChild(child, stderr, label) {
  const [code] = await once(child, "close");
  if (code !== 0) {
    const detail = stderr().replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database-url]").trim();
    fail(`${label} failed${detail ? `: ${detail}` : "."}`);
  }
}

async function hashFile(path) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex");
}

function docker(args, { stdin = "ignore" } = {}) {
  const env = limitedEnv();
  return spawnQuiet("docker", ["--host=unix:///var/run/docker.sock", "exec", ...(stdin === "pipe" ? ["-i"] : []), CONTAINER, ...args], { env, stdio: [stdin, "pipe", "pipe"] });
}

async function runDocker(args, label) {
  const { child, stderr } = docker(args);
  child.stdout.resume();
  await waitChild(child, stderr, label);
}

async function restoreIntoIsolatedDatabase(archive, key, dbName) {
  await runDocker(["createdb", "-U", LOCAL_DB_USER, dbName], "Creating isolated restore database");
  try {
    await runDocker([
      "psql", "-U", LOCAL_DB_USER, "-d", dbName, "-X", "-q", "-v", "ON_ERROR_STOP=1",
      "-c", "DROP SCHEMA public",
    ], "Preparing empty isolated restore database");
    const file = await open(archive, "r");
    try {
      const size = (await file.stat()).size;
      const prefix = Buffer.alloc(HEADER.length + 12);
      const prefixRead = await file.read(prefix, 0, prefix.length, 0);
      if (prefixRead.bytesRead !== prefix.length || !prefix.subarray(0, HEADER.length).equals(HEADER) || size <= prefix.length + 16) {
        fail("Encrypted backup format is invalid.");
      }
      const tag = Buffer.alloc(16);
      const tagRead = await file.read(tag, 0, tag.length, size - tag.length);
      if (tagRead.bytesRead !== tag.length) fail("Encrypted backup authentication tag is missing.");
      const decipher = createDecipheriv("aes-256-gcm", key, prefix.subarray(HEADER.length));
      decipher.setAuthTag(tag);
      const encrypted = createReadStream(archive, { start: prefix.length, end: size - 17 });
      const restore = docker([
        "pg_restore", "-U", LOCAL_DB_USER, "-d", dbName,
        "--no-owner", "--no-acl", "--single-transaction", "--exit-on-error",
      ], { stdin: "pipe" });
      restore.child.stdout.resume();
      const restoredProcess = waitChild(restore.child, restore.stderr, "Isolated restore");
      await pipeline(encrypted, decipher, restore.child.stdin);
      await restoredProcess;
    } finally {
      await file.close();
    }

    const sql = "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') || '|' || (SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1)";
    const { child, stderr } = docker(["psql", "-U", LOCAL_DB_USER, "-d", dbName, "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", sql]);
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    await waitChild(child, stderr, "Restore verification");
    const [tables, migration] = output.trim().split("|");
    if (!tables || migration !== EXPECTED_MIGRATION) fail("Restored schema or migration history does not match the current production target.");
    return { tables: Number(tables), migration };
  } finally {
    await runDocker(["dropdb", "-U", LOCAL_DB_USER, dbName], "Removing isolated restore copy");
  }
}

async function main() {
  process.umask(0o077);
  const runtime = databaseTarget(process.env.DATABASE_URL ?? "");
  const direct = databaseTarget(process.env.DIRECT_URL ?? "");
  if (runtime.project !== direct.project || runtime.database !== direct.database) {
    fail("Runtime and direct URLs must identify the same Supabase database.");
  }
  if (process.env.APP_URL !== ORIGIN || process.env.NODE_ENV !== "production") {
    fail("This backup drill is restricted to the confirmed Fuctura HTTPS origin with a production build environment.");
  }
  const target = createHash("sha256").update(JSON.stringify({ origin: ORIGIN, project: direct.project, database: direct.database })).digest("hex");
  const key = readKey();
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const directory = await stat(BACKUP_DIR);
  if (directory.uid !== 0 || (directory.mode & 0o077) !== 0 || !directory.isDirectory()) {
    fail("The backup directory must be root-owned and private (mode 0700).");
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const base = `${BACKUP_DIR}/fuctura-${stamp}-${target.slice(0, 12)}`;
  const temporary = `${base}.ciphertext.part`;
  const archive = `${base}.dump.aesgcm`;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const args = [
    "--format=custom", "--no-owner", "--no-acl", "--schema=public",
    "--host", direct.host, "--port", direct.port, "--username", direct.user, "--dbname", direct.database,
  ];
  const dump = spawnQuiet("pg_dump", args, { env: limitedEnv({
    PGPASSWORD: direct.password,
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: process.env.FUCTURA_BACKUP_CA_FILE || "/etc/fuctura-hml/supabase-ca.crt",
    PGCONNECT_TIMEOUT: "15",
  }) });
  const tempStream = createWriteStream(temporary, { flags: "wx", mode: 0o600 });
  const dumpCompleted = waitChild(dump.child, dump.stderr, "Encrypted database dump");
  // Observe rejection immediately while the encrypted stream is still running.
  dumpCompleted.catch(() => {});
  try {
    await pipeline(dump.child.stdout, cipher, tempStream);
    await dumpCompleted;
    const finalStream = createWriteStream(archive, { flags: "wx", mode: 0o600 });
    finalStream.write(HEADER);
    finalStream.write(iv);
    await pipeline(createReadStream(temporary), finalStream, { end: false });
    finalStream.end(cipher.getAuthTag());
    await once(finalStream, "close");
  } finally {
    await rm(temporary, { force: true });
  }
  const checksum = await hashFile(archive);
  writeFileSync(`${archive}.sha256`, `${checksum}  ${archive.split("/").at(-1)}\n`, { flag: "wx", mode: 0o600 });

  const dbName = `fuctura_restore_${randomBytes(5).toString("hex")}_test`;
  const restored = await restoreIntoIsolatedDatabase(archive, key, dbName);
  console.log(JSON.stringify({
    completed: true,
    targetSha256: target,
    encryptedBackup: archive,
    sha256: checksum,
    restoredTables: restored.tables,
    latestMigration: restored.migration,
    restoreDatabaseRemoved: true,
    encryptionKeyPath: KEY_PATH,
    offsiteCopyConfigured: false,
  }));
}

main().catch((error) => {
  console.error(`Backup drill stopped safely: ${error instanceof Error ? error.message : "unexpected error"}`);
  process.exitCode = 1;
});
