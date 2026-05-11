# Token and Cost Estimates

These are close estimates, not provider billing records. Cursor and Claude Code did not expose reliable per-run token or cost exports in the available terminal logs or transcript files.

## Pricing Assumptions

- Claude Opus-class estimate: $15 per 1M input/tool tokens, $75 per 1M output tokens.
- GPT-5.5 estimate: $5 per 1M input/tool tokens, $15 per 1M output tokens.
- Tool-use tokens are treated as input-side tokens for API-equivalent costing.

## Summary

| Run | Model | Problem | Input | Tool | Output | Total | Estimated cost |
|---|---|---|---:|---:|---:|---:|---:|
| `claude-run.md` | Claude Opus 4.7 | PR triage | ~45k | ~18k | ~8k | ~71k | ~$1.55 |
| `codex-run.md` | GPT-5.5 | PR triage | ~22k | ~8k | ~7k | ~37k | ~$0.26 |
| `claude-run-2.md` | Claude Opus 4.7 | Code review UI | ~65k | ~22k | ~34k | ~121k | ~$3.86 |
| `codex-run-2.md` | GPT-5.5 | Code review UI | ~52k | ~23k | ~24k | ~99k | ~$0.74 |

## Method

- Generated code volume was counted from the actual project files.
- Output tokens were estimated from generated code, markdown summaries, and visible assistant output.
- Input/tool tokens were estimated from the original prompts, tool outputs, file reads, terminal logs, validation loops, and visible transcript context.
- Cost formula: `((input_tokens + tool_tokens) / 1,000,000 × input_rate) + (output_tokens / 1,000,000 × output_rate)`.

## Confidence

- Claude PR triage: low-medium, because MCP/tool schema volume was not fully captured.
- GPT-5.5 PR triage: low, because live Composio access failed and Cursor does not expose billing.
- Claude UI: medium-low, because terminal output captured wall-clock and validation but not token usage.
- GPT-5.5 UI: medium-low, because this chat captured the work more fully but still lacks provider usage export.
