import { databaseUrl } from "./database-config";

export function curriculumStorageConfiguration(
  env: Record<string, string | undefined> = process.env,
) {
  const key = env.SUPABASE_SECRET_KEY;
  if (!key || !key.startsWith("sb_secret_") || key.startsWith("sb_secret_REPLACE_")) {
    throw new Error("SUPABASE_SECRET_KEY ausente ou inválida.");
  }

  let databaseProject: string | undefined;
  for (const value of [env.DIRECT_URL, env.DATABASE_URL]) {
    if (!value) continue;
    let url: URL;
    try {
      url = new URL(databaseUrl(value));
    } catch {
      // The production configuration validator checks the database URLs separately.
      continue;
    }
    const direct = /^db\.([a-z0-9]{20})\.supabase\.co$/i.exec(url.hostname)?.[1];
    const pool = url.hostname.endsWith(".pooler.supabase.com")
      ? /\.([a-z0-9]{20})$/i.exec(decodeURIComponent(url.username))?.[1]
      : undefined;
    const project = (direct ?? pool)?.toLowerCase();
    if (project) {
      if (databaseProject && databaseProject !== project) {
        throw new Error("Database URLs identify different Supabase projects.");
      }
      databaseProject = project;
    }
  }

  let rawUrl = env.SUPABASE_URL;
  if (!rawUrl && databaseProject) rawUrl = `https://${databaseProject}.supabase.co`;
  if (!rawUrl) throw new Error("SUPABASE_URL ausente.");

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawUrl);
  } catch {
    throw new Error("SUPABASE_URL inválida.");
  }
  const storageProject = /^([a-z0-9-]+)\.supabase\.co$/i.exec(baseUrl.hostname)?.[1].toLowerCase();
  if (baseUrl.protocol !== "https:" || !storageProject || baseUrl.username || baseUrl.password ||
      !["", "/"].includes(baseUrl.pathname) || baseUrl.search || baseUrl.hash ||
      (databaseProject && storageProject !== databaseProject)) {
    throw new Error("SUPABASE_URL inválida ou diferente do projeto do banco.");
  }
  return { key, baseUrl };
}
