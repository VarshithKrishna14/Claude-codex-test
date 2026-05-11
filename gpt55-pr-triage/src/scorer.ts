import type { PullRequestSummary, ScoreBreakdown, ScoredPullRequest } from "./types.js";

export function scorePullRequest(pr: PullRequestSummary): ScoreBreakdown {
  const files = pr.changedFiles * 2;
  const lines = Math.floor((pr.additions + pr.deletions) / 10);
  const missingLabels = pr.labels.length === 0 ? 3 : 0;
  const noReviewers = pr.reviewerCount === 0 ? 5 : 0;
  const total = files + lines + missingLabels + noReviewers;
  return { files, lines, missingLabels, noReviewers, total };
}

export function scorePullRequests(prs: readonly PullRequestSummary[]): ScoredPullRequest[] {
  return prs
    .map((pr) => ({ pr, score: scorePullRequest(pr) }))
    .sort((left, right) => {
      if (right.score.total !== left.score.total) return right.score.total - left.score.total;
      return left.pr.number - right.pr.number;
    });
}
