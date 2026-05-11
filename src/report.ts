import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ScoredPullRequest } from "./types.js";

function escapePipe(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderRow(s: ScoredPullRequest): string {
  const { pr, score } = s;
  const breakdown =
    `files ${score.fileScore} + lines ${score.linesScore}` +
    ` + labels ${score.missingLabelsScore} + reviewers ${score.noReviewersScore}`;
  return `| ${pr.number} | ${escapePipe(pr.title)} | [link](${pr.url}) | ${breakdown} | ${score.total} |`;
}

export function renderReport(params: {
  sorted: readonly ScoredPullRequest[];
  owner: string;
  repo: string;
  alertThreshold: number;
  generatedAt: Date;
}): string {
  const { sorted, owner, repo, alertThreshold, generatedAt } = params;
  const header = [
    `# PR triage report — ${owner}/${repo}`,
    ``,
    `Generated: ${generatedAt.toISOString()}`,
    `Open PRs scored: ${sorted.length}`,
    `Alert threshold (Slack posts for total > N): ${alertThreshold}`,
    ``,
    `## Scoring formula`,
    ``,
    `- File count × 2`,
    `- Lines changed (additions + deletions, divided by 10, floored) × 1`,
    `- Missing labels (none assigned): +3`,
    `- No reviewers (requested_reviewers and requested_teams both empty): +5`,
    ``,
    `## Ranked PRs (highest score first)`,
    ``,
    `| # | Title | URL | Breakdown | Total |`,
    `|---|---|---|---|---|`,
  ].join("\n");
  if (sorted.length === 0) {
    return `${header}\n| _none_ | | | | |\n`;
  }
  const body = sorted.map(renderRow).join("\n");
  return `${header}\n${body}\n`;
}

export async function writeReport(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}
