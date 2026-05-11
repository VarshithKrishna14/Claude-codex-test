import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { RetryLogEntry } from "./types.js";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export async function appendFailure(path: string, entry: RetryLogEntry): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const line = `[${entry.at}] ${entry.action} attempts=${entry.attempts} error=${entry.error}\n`;
  await appendFile(path, line, "utf8");
}

export async function withRetry<T>(
  action: string,
  operation: () => Promise<T>,
  errorsPath: string,
): Promise<T | null> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  await appendFailure(errorsPath, {
    action,
    attempts: MAX_ATTEMPTS,
    error: describeError(lastError),
    at: new Date().toISOString(),
  });
  return null;
}
