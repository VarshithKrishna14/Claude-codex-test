import { Composio } from "@composio/core";
import { loadConfig } from "./config.js";
import { createGitHubClient } from "./github.js";
import { createSlackClient } from "./slack.js";
import { scoreAll, sortByScoreDesc } from "./scorer.js";
import { renderReport, writeReport } from "./report.js";

async function main(): Promise<void> {
  const config = await loadConfig(process.argv.slice(2));

  const composio = new Composio({ apiKey: config.composioApiKey });

  const github = createGitHubClient({
    composio,
    userId: config.composioUserId,
    owner: config.githubOwner,
    repo: config.githubRepo,
    errorLogPath: config.errorLogPath,
  });

  console.log(`[triage] fetching open PRs for ${config.githubOwner}/${config.githubRepo}...`);
  const prs = await github.fetchOpenPullRequests();
  console.log(`[triage] fetched ${prs.length} PRs`);

  const scored = scoreAll(prs);
  const sorted = sortByScoreDesc(scored);

  const reportContent = renderReport({
    sorted,
    owner: config.githubOwner,
    repo: config.githubRepo,
    alertThreshold: config.alertThreshold,
    generatedAt: new Date(),
  });
  await writeReport(config.reportPath, reportContent);
  console.log(`[triage] wrote ${config.reportPath}`);

  const highPriority = sorted.filter((s) => s.score.total > config.alertThreshold);
  console.log(`[triage] ${highPriority.length} PRs exceed threshold ${config.alertThreshold}`);

  if (config.dryRun) {
    console.log(`[triage] --dry-run: skipping Slack alerts`);
    for (const s of highPriority) {
      console.log(`  [would-alert] #${s.pr.number} score=${s.score.total} ${s.pr.title}`);
    }
    return;
  }

  const slack = createSlackClient({
    composio,
    userId: config.composioUserId,
    channel: config.slackAlertChannel,
    errorLogPath: config.errorLogPath,
  });

  let posted = 0;
  for (const s of highPriority) {
    const ok = await slack.postAlert(s);
    if (ok) posted++;
  }
  console.log(`[triage] posted ${posted}/${highPriority.length} Slack alerts to #${config.slackAlertChannel}`);
}

main().catch((err: unknown) => {
  console.error("[triage] fatal error:", err);
  process.exitCode = 1;
});
