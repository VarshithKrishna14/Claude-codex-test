export interface RuntimeConfig {
  readonly composioApiKey: string;
  readonly composioUserId: string;
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly slackChannel: string;
  readonly alertThreshold: number;
  readonly dryRun: boolean;
  readonly outputDir: string;
}

export interface PullRequestSummary {
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly changedFiles: number;
  readonly additions: number;
  readonly deletions: number;
  readonly labels: readonly string[];
  readonly reviewerCount: number;
}

export interface ScoreBreakdown {
  readonly files: number;
  readonly lines: number;
  readonly missingLabels: number;
  readonly noReviewers: number;
  readonly total: number;
}

export interface ScoredPullRequest {
  readonly pr: PullRequestSummary;
  readonly score: ScoreBreakdown;
}

export interface RetryLogEntry {
  readonly action: string;
  readonly attempts: number;
  readonly error: string;
  readonly at: string;
}

export interface ToolExecutionResult {
  readonly successful?: boolean;
  readonly data?: unknown;
  readonly error?: unknown;
}
