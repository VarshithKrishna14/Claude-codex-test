import { Composio } from "@composio/core";
import type { ToolExecutionResult } from "./types.js";

export interface ToolExecutor {
  execute(toolSlug: string, params: Record<string, unknown>): Promise<ToolExecutionResult>;
}

export function createToolExecutor(apiKey: string): ToolExecutor {
  const composio = new Composio({ apiKey });
  return {
    async execute(toolSlug, params) {
      const result = (await composio.tools.execute(toolSlug, params)) as ToolExecutionResult;
      if (result.successful === false) {
        throw new Error(`${toolSlug} failed: ${String(result.error ?? "unknown error")}`);
      }
      return result;
    },
  };
}
