import type { Composio } from "@composio/core";
import type { ScoredPullRequest } from "./types.js";
import { ComposioCallError, withRetry } from "./retry.js";

export interface SlackClient {
  postAlert(scored: ScoredPullRequest): Promise<boolean>;
}

interface SendMessageData {
  readonly ok: boolean;
  readonly error?: string;
}

export function createSlackClient(params: {
  composio: Composio;
  userId: string;
  channel: string;
  errorLogPath: string;
}): SlackClient {
  const { composio, userId, channel, errorLogPath } = params;

  async function send(text: string, context: string): Promise<boolean> {
    const result = await withRetry(
      context,
      async () => {
        const res = await composio.tools.execute("SLACK_SEND_MESSAGE", {
          userId,
          arguments: { channel, text },
        });
        if (!res.successful) {
          throw new ComposioCallError(
            `SLACK_SEND_MESSAGE failed: ${res.error ?? "unknown error"}`,
            res,
          );
        }
        const data = res.data as unknown as SendMessageData;
        if (data.ok === false) {
          throw new ComposioCallError(
            `SLACK_SEND_MESSAGE returned ok=false: ${data.error ?? "unknown slack error"}`,
            data,
          );
        }
        return true;
      },
      errorLogPath,
    );
    return result === true;
  }

  return {
    async postAlert(scored: ScoredPullRequest): Promise<boolean> {
      const { pr, score } = scored;
      // Spec: message must contain PR title, total score, and URL. Nothing else.
      const text = `${pr.title} | score=${score.total} | ${pr.url}`;
      return send(text, `slack alert PR #${pr.number}`);
    },
  };
}
