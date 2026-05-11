import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { RetryFailure } from "./types.js";

export const MAX_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 5_000;

export class ComposioCallError extends Error {
  public override readonly cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "ComposioCallError";
    this.cause = cause;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  context: string,
  fn: () => Promise<T>,
  errorLogPath: string,
): Promise<T | null> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[retry] ${context} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`);
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  const failure: RetryFailure = {
    context,
    attempts: MAX_ATTEMPTS,
    lastError: lastErr instanceof Error ? `${lastErr.name}: ${lastErr.message}` : String(lastErr),
    timestamp: new Date().toISOString(),
  };
  await appendErrorLog(errorLogPath, failure);
  return null;
}

async function appendErrorLog(path: string, failure: RetryFailure): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const line = `[${failure.timestamp}] ${failure.context} | attempts=${failure.attempts} | error=${failure.lastError}\n`;
  await appendFile(path, line, "utf8");
}
