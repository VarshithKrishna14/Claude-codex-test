import { join } from "node:path";
import { loadConfig } from "./config.js";
import { createToolExecutor } from "./composio.js";
import { GitHubClient } from "./github.js";
import { SlackClient } from "./slack.js";
import { scorePullRequests } from "./scorer.js";
import { renderReport, writeReport } from "./report.js";

async function main(): Promise<void> {
  const config = await loadConfig(process.argv.slice(2));
  const errorsPath = join(config.outputDir, "errors.log");
  const reportPath = join(config.outputDir, "triage.md");
  const executor = createToolExecutor(config.composioApiKey);

  const github = new GitHubClient(
    executor,
    config.composioUserId,
    config.githubOwner,
    config.githubRepo,
    errorsPath,
  );
  const slack = new SlackClient(executor, config.composioUserId, config.slackChannel, errorsPath);

  const prs = await github.fetchOpenPullRequests();
  const scored = scorePullRequests(prs);
  await writeReport(
    reportPath,
    renderReport({
      owner: config.githubOwner,
      repo: config.githubRepo,
      generatedAt: new Date(),
      scored,
    }),
  );

  const alerts = scored.filter((item) => item.score.total > config.alertThreshold);
  if (config.dryRun) {
    for (const alert of alerts) {
      console.log(`[dry-run] ${alert.pr.title} | ${alert.score.total} | ${alert.pr.url}`);
    }
    return;
  }

  for (const alert of alerts) {
    await slack.postPriorityAlert(alert);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
