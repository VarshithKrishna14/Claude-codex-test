export interface PullRequest {
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly additions: number;
  readonly deletions: number;
  readonly changedFiles: number;
  readonly labelCount: number;
  readonly reviewerCount: number;
}

export interface ScoreBreakdown {
  readonly fileScore: number;
  readonly linesScore: number;
  readonly missingLabelsScore: number;
  readonly noReviewersScore: number;
  readonly total: number;
}

export interface ScoredPullRequest {
  readonly pr: PullRequest;
  readonly score: ScoreBreakdown;
}

export interface TriageConfig {
  readonly composioApiKey: string;
  readonly composioUserId: string;
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly slackAlertChannel: string;
  readonly alertThreshold: number;
  readonly dryRun: boolean;
  readonly errorLogPath: string;
  readonly reportPath: string;
}

export interface RetryFailure {
  readonly context: string;
  readonly attempts: number;
  readonly lastError: string;
  readonly timestamp: string;
}
