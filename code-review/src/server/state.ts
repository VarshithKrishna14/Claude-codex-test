import { randomUUID } from "node:crypto";
import type { Comment, Reviewer, ReviewerStatus, Side, Thread } from "../shared/types.js";
import { SEED_REVIEWERS, SEED_THREADS } from "./seed.js";

export class ReviewState {
  private reviewers: Map<string, Reviewer> = new Map();
  private threads: Map<string, Thread> = new Map();

  constructor() {
    for (const r of SEED_REVIEWERS) this.reviewers.set(r.id, r);
    for (const t of SEED_THREADS) this.threads.set(t.id, t);
  }

  snapshot(): { reviewers: Reviewer[]; threads: Thread[] } {
    return {
      reviewers: [...this.reviewers.values()],
      threads: [...this.threads.values()],
    };
  }

  ensureReviewer(userId: string): Reviewer {
    const existing = this.reviewers.get(userId);
    if (existing) return existing;
    const name = userId.charAt(0).toUpperCase() + userId.slice(1);
    const fresh: Reviewer = { id: userId, name, status: "commented" };
    this.reviewers.set(userId, fresh);
    return fresh;
  }

  addThread(params: {
    authorId: string;
    side: Side;
    line: number;
    body: string;
  }): Thread {
    const reviewer = this.ensureReviewer(params.authorId);
    const now = new Date().toISOString();
    const comment: Comment = {
      id: `c-${randomUUID()}`,
      authorId: reviewer.id,
      authorName: reviewer.name,
      body: params.body,
      createdAt: now,
    };
    const thread: Thread = {
      id: `t-${randomUUID()}`,
      anchor: { side: params.side, line: params.line },
      resolved: false,
      comments: [comment],
    };
    this.threads.set(thread.id, thread);
    return thread;
  }

  addReply(params: { authorId: string; threadId: string; body: string }): {
    thread: Thread;
    comment: Comment;
  } | null {
    const existing = this.threads.get(params.threadId);
    if (!existing) return null;
    const reviewer = this.ensureReviewer(params.authorId);
    const comment: Comment = {
      id: `c-${randomUUID()}`,
      authorId: reviewer.id,
      authorName: reviewer.name,
      body: params.body,
      createdAt: new Date().toISOString(),
    };
    const next: Thread = { ...existing, comments: [...existing.comments, comment] };
    this.threads.set(next.id, next);
    return { thread: next, comment };
  }

  setResolved(threadId: string, resolved: boolean): Thread | null {
    const existing = this.threads.get(threadId);
    if (!existing) return null;
    if (existing.resolved === resolved) return existing;
    const next: Thread = { ...existing, resolved };
    this.threads.set(next.id, next);
    return next;
  }

  setStatus(userId: string, status: ReviewerStatus): Reviewer {
    const reviewer = this.ensureReviewer(userId);
    const next: Reviewer = { ...reviewer, status };
    this.reviewers.set(next.id, next);
    return next;
  }
}
