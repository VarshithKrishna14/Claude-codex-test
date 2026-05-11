import type { ToolExecutor } from "./composio.js";
import type { ScoredPullRequest } from "./types.js";
import { withRetry } from "./retry.js";

interface SlackSendData {
  readonly ok?: boolean;
  readonly error?: string;
}

function asSlackSendData(value: unknown): SlackSendData {
  if (typeof value !== "object" || value === null) return {};
  return value as unknown as SlackSendData;
}

export class SlackClient {
  constructor(
    private readonly executor: ToolExecutor,
    private readonly userId: string,
    private readonly channel: string,
    private readonly errorsPath: string,
  ) {}

  async postPriorityAlert(scored: ScoredPullRequest): Promise<boolean> {
    const message = `${scored.pr.title} | ${scored.score.total} | ${scored.pr.url}`;
    const result = await withRetry(
      `slack alert pull request ${scored.pr.number}`,
      async () => {
        const response = await this.executor.execute("SLACK_SEND_MESSAGE", {
          userId: this.userId,
          arguments: {
            channel: this.channel,
            text: message,
          },
        });
        const data = asSlackSendData(response.data);
        if (data.ok === false) throw new Error(data.error ?? "Slack returned ok=false");
        return true;
      },
      this.errorsPath,
    );

    return result === true;
  }
}
