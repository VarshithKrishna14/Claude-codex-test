import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { TriageConfig } from "./types.js";

async function loadDotEnv(path: string): Promise<void> {
  try {
    const raw = await readFile(path, "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export async function loadConfig(argv: readonly string[]): Promise<TriageConfig> {
  await loadDotEnv(resolve(process.cwd(), ".env"));
  const dryRun = argv.includes("--dry-run");
  const thresholdRaw = optional("ALERT_THRESHOLD", "20");
  const alertThreshold = Number.parseInt(thresholdRaw, 10);
  if (!Number.isFinite(alertThreshold)) {
    throw new Error(`ALERT_THRESHOLD must be an integer, got: ${thresholdRaw}`);
  }
  return {
    composioApiKey: requireEnv("COMPOSIO_API_KEY"),
    composioUserId: optional("COMPOSIO_USER_ID", "default"),
    githubOwner: optional("GITHUB_OWNER", "composio-dev"),
    githubRepo: optional("GITHUB_REPO", "composio"),
    slackAlertChannel: optional("SLACK_ALERT_CHANNEL", "dev-alerts"),
    alertThreshold,
    dryRun,
    errorLogPath: resolve(process.cwd(), "output", "errors.log"),
    reportPath: resolve(process.cwd(), "output", "triage.md"),
  };
}
