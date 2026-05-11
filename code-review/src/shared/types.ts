export type Side = "old" | "new";
export type ReviewerStatus = "commented" | "approved" | "changes_requested";

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
  readonly comments: Comment[];
  readonly resolved: boolean;
}

export type OverallStatus = "blocked" | "approved" | "pending";

export function deriveOverallStatus(reviewers: Reviewer[]): OverallStatus {
  if (reviewers.some((r) => r.status === "changes_requested")) return "blocked";
  if (reviewers.length > 0 && reviewers.every((r) => r.status === "approved")) return "approved";
  return "pending";
}
