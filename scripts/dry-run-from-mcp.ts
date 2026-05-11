// Dry-run driver: feeds real PR data (already fetched via MCP in this session)
// through the production scorer + report modules.
// This is NOT part of the runtime system - it's a one-shot validation harness.
import { scoreAll, sortByScoreDesc } from "../src/scorer.js";
import { renderReport, writeReport } from "../src/report.js";
import type { PullRequest } from "../src/types.js";
import { resolve } from "node:path";

const prs: PullRequest[] = [
  {
    number: 5,
    title: "Test PR: Fix README Logo - Updated Title",
    url: "https://github.com/composio-dev/composio/pull/5",
    additions: 1,
    deletions: 1,
    changedFiles: 1,
    labelCount: 0,
    reviewerCount: 0,
  },
];

const ALERT_THRESHOLD = 20;
const scored = scoreAll(prs);
const sorted = sortByScoreDesc(scored);

const md = renderReport({
  sorted,
  owner: "composio-dev",
  repo: "composio",
  alertThreshold: ALERT_THRESHOLD,
  generatedAt: new Date(),
});

const out = resolve(process.cwd(), "output", "triage.md");
await writeReport(out, md);
console.log(`[dry-run] wrote ${out}`);

const highPriority = sorted.filter((s) => s.score.total > ALERT_THRESHOLD);
console.log(`[dry-run] ${highPriority.length} PRs exceed threshold ${ALERT_THRESHOLD}`);
for (const s of highPriority) {
  console.log(`  [would-alert] #${s.pr.number} score=${s.score.total} ${s.pr.title}`);
}
for (const s of sorted) {
  console.log(`  #${s.pr.number} total=${s.score.total} (files=${s.score.fileScore} lines=${s.score.linesScore} labels=${s.score.missingLabelsScore} reviewers=${s.score.noReviewersScore})`);
}
