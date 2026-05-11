import { randomUUID } from "node:crypto";
import type { Comment, Reviewer, ReviewerStatus, Side, Thread } from "../shared/types.js";
import { reviewers as seedReviewers, threads as seedThreads } from "./seed.js";

export class ReviewState {
  private readonly reviewers = new Map<string, Reviewer>();
  private readonly threads = new Map<string, Thread>();

  constructor() {
    for (const reviewer of seedReviewers) this.reviewers.set(reviewer.id, reviewer);
    for (const thread of seedThreads) this.threads.set(thread.id, thread);
  }

  snapshot(): { reviewers: Reviewer[]; threads: Thread[] } {
    return { reviewers: [...this.reviewers.values()], threads: [...this.threads.values()] };
  }

  ensureReviewer(id: string): Reviewer {
    const existing = this.reviewers.get(id);
    if (existing) return existing;
    const created: Reviewer = { id, name: id, status: "commented" };
    this.reviewers.set(id, created);
    return created;
  }

  addThread(reviewerId: string, side: Side, line: number, body: string): Thread {
    const author = this.ensureReviewer(reviewerId);
    const thread: Thread = {
      id: `thread-${randomUUID()}`,
      anchor: { side, line },
      resolved: false,
      comments: [this.createComment(author, body)],
    };
    this.threads.set(thread.id, thread);
    return thread;
  }

  addReply(reviewerId: string, threadId: string, body: string): Comment | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    const comment = this.createComment(this.ensureReviewer(reviewerId), body);
    this.threads.set(threadId, { ...thread, comments: [...thread.comments, comment] });
    return comment;
  }

  setResolved(threadId: string, resolved: boolean): Thread | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    const updated: Thread = { ...thread, resolved };
    this.threads.set(threadId, updated);
    return updated;
  }

  setReviewerStatus(reviewerId: string, status: ReviewerStatus): Reviewer {
    const existing = this.ensureReviewer(reviewerId);
    const updated: Reviewer = { ...existing, status };
    this.reviewers.set(reviewerId, updated);
    return updated;
  }

  private createComment(author: Reviewer, body: string): Comment {
    return {
      id: `comment-${randomUUID()}`,
      authorId: author.id,
      authorName: author.name,
      body,
      createdAt: new Date().toISOString(),
    };
  }
}
