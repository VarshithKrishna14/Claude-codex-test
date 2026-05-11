import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RuntimeConfig } from "./types.js";

async function loadDotEnv(path: string): Promise<void> {
  try {
    const raw = await readFile(path, "utf8");
    for (const row of raw.split(/\r?\n/)) {
      const trimmed = row.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[key] ??= value;
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export async function loadConfig(argv: readonly string[]): Promise<RuntimeConfig> {
  await loadDotEnv(resolve(process.cwd(), ".env"));
  const thresholdRaw = optionalEnv("ALERT_THRESHOLD", "20");
  const alertThreshold = Number.parseInt(thresholdRaw, 10);
  if (!Number.isInteger(alertThreshold)) {
    throw new Error(`ALERT_THRESHOLD must be an integer, received ${thresholdRaw}`);
  }

  return {
    composioApiKey: requireEnv("COMPOSIO_API_KEY"),
    composioUserId: optionalEnv("COMPOSIO_USER_ID", "default"),
    githubOwner: optionalEnv("GITHUB_OWNER", "composio-dev"),
    githubRepo: optionalEnv("GITHUB_REPO", "composio"),
    slackChannel: optionalEnv("SLACK_ALERT_CHANNEL", "dev-alerts"),
    alertThreshold,
    dryRun: argv.includes("--dry-run"),
    outputDir: resolve(process.cwd(), "output"),
  };
}
