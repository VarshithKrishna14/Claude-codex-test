export type Side = "old" | "new";
export type ReviewerStatus = "commented" | "approved" | "changes_requested";
export type OverallStatus = "commented" | "approved" | "blocked";

export interface Reviewer {
  readonly id: string;
  readonly name: string;
  readonly status: ReviewerStatus;
}

export interface Comment {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly createdAt: string;
}

export interface ThreadAnchor {
  readonly side: Side;
  readonly line: number;
}

export interface Thread {
  readonly id: string;
  readonly anchor: ThreadAnchor;
  readonly comments: readonly Comment[];
  readonly resolved: boolean;
}

export function deriveOverallStatus(reviewers: readonly Reviewer[]): OverallStatus {
  if (reviewers.some((reviewer) => reviewer.status === "changes_requested")) return "blocked";
  if (reviewers.length > 0 && reviewers.every((reviewer) => reviewer.status === "approved")) {
    return "approved";
  }
  return "commented";
}
