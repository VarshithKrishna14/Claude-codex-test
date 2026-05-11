import { create } from "zustand";
import type { ClientMessage, ServerMessage } from "../../shared/messages.js";
import { deriveOverallStatus, type Comment, type Reviewer, type ReviewerStatus, type Side, type Thread } from "../../shared/types.js";

export type ViewMode = "split" | "unified";
export type SocketStatus = "connecting" | "open" | "reconnecting" | "closed";

interface Toast {
  readonly id: string;
  readonly message: string;
}

type PendingOperation =
  | { readonly kind: "thread"; readonly threadId: string; readonly key: string }
  | { readonly kind: "reply"; readonly threadId: string; readonly commentId: string }
  | { readonly kind: "resolved"; readonly threadId: string; readonly previous: boolean }
  | { readonly kind: "status"; readonly reviewerId: string; readonly previous: ReviewerStatus };

interface StoreState {
  readonly hydrated: boolean;
  readonly currentReviewerId: string;
  readonly reviewers: Record<string, Reviewer>;
  readonly threads: Record<string, Thread>;
  readonly threadsByLine: Record<string, readonly string[]>;
  readonly expandedResolved: Record<string, boolean>;
  readonly viewMode: ViewMode;
  readonly socketStatus: SocketStatus;
  readonly toasts: readonly Toast[];
  readonly pendingOps: Record<string, PendingOperation>;
  readonly sender: ((message: ClientMessage) => void) | null;

  hydrate(reviewers: readonly Reviewer[], threads: readonly Thread[]): void;
  setSender(sender: ((message: ClientMessage) => void) | null): void;
  setSocketStatus(status: SocketStatus): void;
  setCurrentReviewer(id: string): void;
  setViewMode(mode: ViewMode): void;
  toggleResolved(threadId: string): void;
  addThread(side: Side, line: number, body: string): void;
  addReply(threadId: string, body: string): void;
  setResolved(threadId: string, resolved: boolean): void;
  setReviewerStatus(status: ReviewerStatus): void;
  applyServerMessage(message: ServerMessage): void;
  removeToast(id: string): void;
}

let sequence = 0;
const newId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(sequence += 1).toString(36)}`;
const lineKey = (side: Side, line: number): string => `${side}:${line}`;

function indexThreads(threads: Record<string, Thread>): Record<string, readonly string[]> {
  const index: Record<string, string[]> = {};
  for (const thread of Object.values(threads)) {
    const key = lineKey(thread.anchor.side, thread.anchor.line);
    index[key] = [...(index[key] ?? []), thread.id];
  }
  return index;
}

function addToast(state: StoreState, message: string): readonly Toast[] {
  return [...state.toasts, { id: newId("toast"), message }];
}

export const useReviewStore = create<StoreState>((set, get) => ({
  hydrated: false,
  currentReviewerId: "alice",
  reviewers: {},
  threads: {},
  threadsByLine: {},
  expandedResolved: {},
  viewMode: "split",
  socketStatus: "connecting",
  toasts: [],
  pendingOps: {},
  sender: null,

  hydrate: (reviewers, threads) =>
    set((state) => {
      if (state.hydrated) return state;
      const reviewerMap = Object.fromEntries(reviewers.map((reviewer) => [reviewer.id, reviewer]));
      const threadMap = Object.fromEntries(threads.map((thread) => [thread.id, thread]));
      return { hydrated: true, reviewers: reviewerMap, threads: threadMap, threadsByLine: indexThreads(threadMap) };
    }),
  setSender: (sender) => set({ sender }),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  setCurrentReviewer: (currentReviewerId) => set({ currentReviewerId }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleResolved: (threadId) =>
    set((state) => ({
      expandedResolved: { ...state.expandedResolved, [threadId]: !state.expandedResolved[threadId] },
    })),

  addThread: (side, line, body) => {
    const state = get();
    if (!state.sender) return;
    const opId = newId("op");
    const author = state.reviewers[state.currentReviewerId];
    const thread: Thread = {
      id: opId,
      anchor: { side, line },
      resolved: false,
      comments: [
        {
          id: `${opId}-comment`,
          authorId: state.currentReviewerId,
          authorName: author?.name ?? state.currentReviewerId,
          body,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    set((current) => {
      const threads = { ...current.threads, [thread.id]: thread };
      return {
        threads,
        threadsByLine: indexThreads(threads),
        pendingOps: { ...current.pendingOps, [opId]: { kind: "thread", threadId: thread.id, key: lineKey(side, line) } },
      };
    });
    state.sender({ type: "addThread", opId, side, line, body });
    setTimeout(() => {
      if (get().pendingOps[opId]) rollback(opId, "Server did not acknowledge the thread", set, get);
    }, 5_000);
  },

  addReply: (threadId, body) => {
    const state = get();
    if (!state.sender) return;
    const thread = state.threads[threadId];
    if (!thread) return;
    const opId = newId("op");
    const commentId = `${opId}-comment`;
    const author = state.reviewers[state.currentReviewerId];
    const comment: Comment = {
      id: commentId,
      authorId: state.currentReviewerId,
      authorName: author?.name ?? state.currentReviewerId,
      body,
      createdAt: new Date().toISOString(),
    };
    set((current) => ({
      threads: { ...current.threads, [threadId]: { ...thread, comments: [...thread.comments, comment] } },
      pendingOps: { ...current.pendingOps, [opId]: { kind: "reply", threadId, commentId } },
    }));
    state.sender({ type: "addReply", opId, threadId, body });
    setTimeout(() => {
      if (get().pendingOps[opId]) rollback(opId, "Server did not acknowledge the reply", set, get);
    }, 5_000);
  },

  setResolved: (threadId, resolved) => {
    const state = get();
    if (!state.sender) return;
    const thread = state.threads[threadId];
    if (!thread) return;
    const opId = newId("op");
    set((current) => ({
      threads: { ...current.threads, [threadId]: { ...thread, resolved } },
      pendingOps: { ...current.pendingOps, [opId]: { kind: "resolved", threadId, previous: thread.resolved } },
    }));
    state.sender({ type: "setResolved", opId, threadId, resolved });
    setTimeout(() => {
      if (get().pendingOps[opId]) rollback(opId, "Server did not acknowledge the resolve change", set, get);
    }, 5_000);
  },

  setReviewerStatus: (status) => {
    const state = get();
    if (!state.sender) return;
    const reviewer = state.reviewers[state.currentReviewerId];
    if (!reviewer) return;
    const opId = newId("op");
    set((current) => ({
      reviewers: { ...current.reviewers, [reviewer.id]: { ...reviewer, status } },
      pendingOps: { ...current.pendingOps, [opId]: { kind: "status", reviewerId: reviewer.id, previous: reviewer.status } },
    }));
    state.sender({ type: "setReviewerStatus", opId, status });
    setTimeout(() => {
      if (get().pendingOps[opId]) rollback(opId, "Server did not acknowledge the status change", set, get);
    }, 5_000);
  },

  applyServerMessage: (message) => {
    if (message.type === "bootstrap") {
      get().hydrate(message.reviewers, message.threads);
      return;
    }
    if (message.type === "reject") {
      rollback(message.opId, message.reason, set, get);
      return;
    }
    set((state) => applyAcceptedMessage(state, message));
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

function applyAcceptedMessage(state: StoreState, message: Exclude<ServerMessage, { type: "bootstrap" | "reject" }>): Partial<StoreState> {
  const pending = message.opId ? state.pendingOps[message.opId] : undefined;
  const nextPending = message.opId ? { ...state.pendingOps } : state.pendingOps;
  if (message.opId) delete nextPending[message.opId];

  if (message.type === "threadAdded") {
    const threads = { ...state.threads };
    if (pending?.kind === "thread") delete threads[pending.threadId];
    threads[message.thread.id] = message.thread;
    return { threads, threadsByLine: indexThreads(threads), pendingOps: nextPending };
  }
  if (message.type === "replyAdded") {
    const thread = state.threads[message.threadId];
    if (!thread) return {};
    const comments = thread.comments.filter((comment) => pending?.kind !== "reply" || comment.id !== pending.commentId);
    return {
      threads: { ...state.threads, [thread.id]: { ...thread, comments: [...comments, message.comment] } },
      pendingOps: nextPending,
    };
  }
  if (message.type === "threadResolved") {
    const thread = state.threads[message.threadId];
    if (!thread) return {};
    return { threads: { ...state.threads, [thread.id]: { ...thread, resolved: message.resolved } }, pendingOps: nextPending };
  }
  const reviewer = state.reviewers[message.reviewerId] ?? { id: message.reviewerId, name: message.reviewerId, status: "commented" };
  return { reviewers: { ...state.reviewers, [reviewer.id]: { ...reviewer, status: message.status } }, pendingOps: nextPending };
}

function rollback(
  opId: string,
  reason: string,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  get: () => StoreState,
): void {
  const op = get().pendingOps[opId];
  if (!op) return;
  set((state) => {
    const pendingOps = { ...state.pendingOps };
    delete pendingOps[opId];
    if (op.kind === "thread") {
      const threads = { ...state.threads };
      delete threads[op.threadId];
      return { threads, threadsByLine: indexThreads(threads), pendingOps, toasts: addToast(state, reason) };
    }
    if (op.kind === "reply") {
      const thread = state.threads[op.threadId];
      if (!thread) return { pendingOps, toasts: addToast(state, reason) };
      return {
        threads: { ...state.threads, [thread.id]: { ...thread, comments: thread.comments.filter((comment) => comment.id !== op.commentId) } },
        pendingOps,
        toasts: addToast(state, reason),
      };
    }
    if (op.kind === "resolved") {
      const thread = state.threads[op.threadId];
      if (!thread) return { pendingOps, toasts: addToast(state, reason) };
      return { threads: { ...state.threads, [thread.id]: { ...thread, resolved: op.previous } }, pendingOps, toasts: addToast(state, reason) };
    }
    const reviewer = state.reviewers[op.reviewerId];
    if (!reviewer) return { pendingOps, toasts: addToast(state, reason) };
    return {
      reviewers: { ...state.reviewers, [reviewer.id]: { ...reviewer, status: op.previous } },
      pendingOps,
      toasts: addToast(state, reason),
    };
  });
}

export function selectReviewers(): Reviewer[] {
  return Object.values(useReviewStore.getState().reviewers);
}

export function selectOverallStatus(): string {
  return deriveOverallStatus(Object.values(useReviewStore.getState().reviewers));
}
