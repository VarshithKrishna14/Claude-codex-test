import type { PullRequest, ScoreBreakdown, ScoredPullRequest } from "./types.js";

const FILE_WEIGHT = 2;
const LINES_DIVISOR = 10;
const MISSING_LABELS_BONUS = 3;
const NO_REVIEWERS_BONUS = 5;

export function scorePullRequest(pr: PullRequest): ScoreBreakdown {
  const fileScore = pr.changedFiles * FILE_WEIGHT;
  const linesScore = Math.floor((pr.additions + pr.deletions) / LINES_DIVISOR);
  const missingLabelsScore = pr.labelCount === 0 ? MISSING_LABELS_BONUS : 0;
  const noReviewersScore = pr.reviewerCount === 0 ? NO_REVIEWERS_BONUS : 0;
  const total = fileScore + linesScore + missingLabelsScore + noReviewersScore;
  return { fileScore, linesScore, missingLabelsScore, noReviewersScore, total };
}

export function scoreAll(prs: readonly PullRequest[]): ScoredPullRequest[] {
  return prs.map((pr) => ({ pr, score: scorePullRequest(pr) }));
}

export function sortByScoreDesc(scored: readonly ScoredPullRequest[]): ScoredPullRequest[] {
  return [...scored].sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    return a.pr.number - b.pr.number;
  });
}
