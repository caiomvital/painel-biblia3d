export function stagingIndexHeaders(
  environment = process.env.APP_ENV,
  appUrl = process.env.APP_URL,
): Record<string, string> {
  let temporaryHost = false;
  try {
    const hostname = new URL(appUrl ?? "").hostname.toLowerCase();
    temporaryHost = hostname.endsWith(".sslip.io") || /hml|staging|homolog/.test(hostname);
  } catch {
    // Invalid APP_URL is rejected by production configuration checks.
  }
  if (environment === "staging" || temporaryHost) {
    return {
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...(environment === "staging" ? {
        "X-Fuctura-Environment": "staging",
      } : {}),
    };
  }
  return {};
}
