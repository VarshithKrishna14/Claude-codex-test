import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ScoredPullRequest } from "./types.js";

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderBreakdown(scored: ScoredPullRequest): string {
  const { score } = scored;
  return `files ${score.files} + lines ${score.lines} + labels ${score.missingLabels} + reviewers ${score.noReviewers}`;
}

export function renderReport(params: {
  readonly owner: string;
  readonly repo: string;
  readonly generatedAt: Date;
  readonly scored: readonly ScoredPullRequest[];
}): string {
  const lines = [
    `# PR triage report - ${params.owner}/${params.repo}`,
    "",
    `Generated: ${params.generatedAt.toISOString()}`,
    `Open PRs scored: ${params.scored.length}`,
    "",
    "| PR number | Title | URL | Score breakdown | Total score |",
    "|---:|---|---|---|---:|",
  ];

  if (params.scored.length === 0) {
    lines.push("| _none_ | | | | |");
  } else {
    for (const scored of params.scored) {
      lines.push(
        `| ${scored.pr.number} | ${escapeCell(scored.pr.title)} | ${scored.pr.url} | ${renderBreakdown(scored)} | ${scored.score.total} |`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export async function writeReport(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}
