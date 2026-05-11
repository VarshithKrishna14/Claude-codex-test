# Claude vs Codex: AI Coding Comparison

A practical comparison between Claude Code and OpenAI Codex on real development tasks with MCP-oriented workflows and validation.

## Overview

This repository contains code and results from head-to-head runs across two tasks:

- **Claude Code (Opus 4.7)**
- **OpenAI Codex (GPT-5.5)**

The benchmark includes:

1. **PR Triage System** (MCP/Composio style integration)
2. **Real-time Collaborative Code Review UI** (React + WebSocket)

There are two implementation sets:

- Original task runs:
  - `src/`, `scripts/`, `output/` (PR triage)
  - `code-review/` (UI app)
- Fresh GPT-5.5 rebuilds:
  - `gpt55-pr-triage/`
  - `gpt55-code-review/`

Run logs:

- `claude-run.md` (Task 1 / Claude)
- `codex-run.md` (Task 1 / GPT-5.5)
- `claude-run-2.md` (Task 2 / Claude)
- `codex-run-2.md` (Task 2 / GPT-5.5)

---

## Test Challenges

### 1) PR Triage System

Folders:

- Claude task output: `src/` + `scripts/` + `output/`
- GPT-5.5 fresh build: `gpt55-pr-triage/`

Task:

- Read open PRs for `composio-dev/composio`
- Score each PR with:
  - file count × 2
  - floor((additions + deletions) / 10)
  - +3 if no labels
  - +5 if no reviewers
- Write ranked markdown report
- Post Slack alerts for score > 20
- Retry failing tool calls (3 attempts, 5s delay)

Results:

- **Claude (Opus 4.7):**
  - Produced valid triage output with 1 scored PR in `output/triage.md`
  - Formula and report formatting validated
  - No Slack alert triggered (score below threshold)
- **GPT-5.5 (fresh rebuild):**
  - Built strict modular implementation in `gpt55-pr-triage/`
  - Typecheck passed
  - Runtime encountered Composio tool availability failure (`GITHUB_LIST_PULL_REQUESTS`) and correctly logged retries to `gpt55-pr-triage/output/errors.log`

---

### 2) Real-time Collaborative Code Review UI

Folders:

- Claude run output: `code-review/`
- GPT-5.5 fresh build: `gpt55-code-review/`

Task:

- Diff viewer with split/unified modes
- Syntax highlighting + line numbers
- Virtualization threshold for large diffs
- Inline comment threads + replies + resolve/unresolve
- Real-time sync via WebSocket server
- Optimistic updates with rollback on reject/no-ack
- Reviewer statuses and derived overall PR status

Results:

- **Claude (Opus 4.7):**
  - Built a larger UI system (`code-review/src` has 36 files)
  - All components under 200 lines
  - Two-client smoke test succeeded with ~3ms propagation in terminal logs
- **GPT-5.5 (fresh rebuild):**
  - Built full UI + WS stack in `gpt55-code-review/` (`src` has 28 files)
  - Typecheck passed after fixes
  - Two-client smoke test succeeded: `[smoke] OK broadcast=5ms`

---

## MCP Setup Notes

This benchmark used MCP-style tool integration via Composio paths.

- Claude environment showed Composio MCP connected in CLI checks.
- GPT-5.5 Cursor tool surface exposed browser MCP directly, while Composio execution for one run failed at tool resolution/runtime.

If you want deterministic reruns, verify the following before execution:

1. Valid Composio API key
2. GitHub and Slack accounts connected under the intended `COMPOSIO_USER_ID`
3. Tool slugs available in your Composio project

---

## Key Findings

### Claude Code Strengths

- Stronger completeness on the UI-heavy task
- More exhaustive componentization and richer architecture
- Excellent realtime collaboration implementation quality in observed run

### Codex (GPT-5.5) Strengths

- Fast iteration and concise implementation style
- Strong strict TypeScript discipline in fresh rebuilds
- Good reliability patterns (retry/logging/rollback) in compact codebases

### Practical Difference

- Claude run delivered broader UI depth in one pass.
- GPT-5.5 fresh runs were compact, typed, and passed validations, but the PR-triage runtime depended on external Composio availability.

---

## Cost Comparison (Estimated)

See:

- `run-cost-estimates.md`

Important:

- These are **API-equivalent estimates**, not provider billing exports.
- Cursor/terminal logs did not expose exact per-run billing.

Current estimates:

- Claude PR triage: ~$1.55
- GPT-5.5 PR triage: ~$0.26
- Claude UI: ~$3.86
- GPT-5.5 UI: ~$0.74

---

## How To Re-run

### PR Triage

```bash
cd gpt55-pr-triage
npm run typecheck
npm run dry-run
```

### UI + WebSocket

```bash
cd gpt55-code-review
npm run typecheck
npm run dev
# optional smoke check in another terminal
npm run smoke
```

---

## Repository Artifacts

- `output/blog.md` — long-form comparison writeup
- `output/screenshots/code-review-ui.png` — UI screenshot
- `output/triage.md` — original triage report
- `gpt55-pr-triage/output/triage.md` — fresh rebuild report
- `gpt55-pr-triage/output/errors.log` — fresh rebuild runtime errors

