import { create } from "zustand";
import type {
  Comment,
  Reviewer,
  ReviewerStatus,
  Side,
  Thread,
} from "../../shared/types.js";
import type { ClientMessage, ServerMessage } from "../../shared/messages.js";

export type WsStatus = "connecting" | "open" | "reconnecting" | "closed";
export interface Toast {
  readonly id: string;
  readonly message: string;
}
type PendingOp =
  | { kind: "add_thread"; tempThreadId: string; anchorKey: string }
  | { kind: "add_reply"; threadId: string; tempCommentId: string }
  | { kind: "resolve"; threadId: string; previousResolved: boolean }
  | { kind: "set_status"; userId: string; previousStatus: ReviewerStatus };

export interface ReviewStore {
  wsStatus: WsStatus;
  currentUserId: string;
  reviewers: Record<string, Reviewer>;
  threads: Record<string, Thread>;
  threadsByAnchor: Record<string, string[]>;
  viewMode: "split" | "unified";
  composerAnchor: { side: Side; line: number } | null;
  expandedResolved: Set<string>;
  toasts: Toast[];
  pendingOps: Map<string, PendingOp>;
  sendMessage: ((msg: ClientMessage) => void) | null;

  setSendMessage(fn: ((msg: ClientMessage) => void) | null): void;
  setWsStatus(status: WsStatus): void;
  setCurrentUser(id: string): void;
  setViewMode(mode: "split" | "unified"): void;
  openComposer(side: Side, line: number): void;
  closeComposer(): void;
  toggleResolvedExpansion(threadId: string): void;
  pushToast(message: string): void;
  dismissToast(id: string): void;

  optimisticAddThread(side: Side, line: number, body: string): void;
  optimisticReply(threadId: string, body: string): void;
  optimisticResolve(threadId: string, resolved: boolean): void;
  optimisticSetStatus(status: ReviewerStatus): void;

  applyServerEvent(msg: ServerMessage): void;
  rollbackOp(opId: string, reason: string): void;
}

const anchorKey = (side: Side, line: number): string => `${side}:${line}`;
let opCounter = 0;
const newOpId = (): string => `op-${Date.now().toString(36)}-${(opCounter++).toString(36)}`;

function indexThread(map: Record<string, string[]>, thread: Thread): Record<string, string[]> {
  const k = anchorKey(thread.anchor.side, thread.anchor.line);
  const existing = map[k] ?? [];
  if (existing.includes(thread.id)) return map;
  return { ...map, [k]: [...existing, thread.id] };
}

function removeFromIndex(
  map: Record<string, string[]>,
  threadId: string,
  side: Side,
  line: number,
): Record<string, string[]> {
  const k = anchorKey(side, line);
  const list = map[k];
  if (!list) return map;
  const next = list.filter((id) => id !== threadId);
  return { ...map, [k]: next };
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  wsStatus: "connecting",
  currentUserId: "alice",
  reviewers: {},
  threads: {},
  threadsByAnchor: {},
  viewMode: "split",
  composerAnchor: null,
  expandedResolved: new Set(),
  toasts: [],
  pendingOps: new Map(),
  sendMessage: null,

  setSendMessage: (fn) => set({ sendMessage: fn }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setCurrentUser: (id) => set({ currentUserId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  openComposer: (side, line) => set({ composerAnchor: { side, line } }),
  closeComposer: () => set({ composerAnchor: null }),
  toggleResolvedExpansion: (threadId) =>
    set((s) => {
      const next = new Set(s.expandedResolved);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return { expandedResolved: next };
    }),
  pushToast: (message) =>
    set((s) => ({ toasts: [...s.toasts, { id: newOpId(), message }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  optimisticAddThread: (side, line, body) => {
    const { sendMessage, currentUserId, reviewers, pendingOps } = get();
    if (!sendMessage) return;
    const opId = newOpId();
    const me = reviewers[currentUserId];
    const authorName = me?.name ?? currentUserId;
    const tempThread: Thread = {
      id: opId,
      anchor: { side, line },
      resolved: false,
      comments: [
        {
          id: `${opId}-c`,
          authorId: currentUserId,
          authorName,
          body,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    const nextOps = new Map(pendingOps);
    nextOps.set(opId, { kind: "add_thread", tempThreadId: opId, anchorKey: anchorKey(side, line) });
    set((s) => ({
      threads: { ...s.threads, [tempThread.id]: tempThread },
      threadsByAnchor: indexThread(s.threadsByAnchor, tempThread),
      pendingOps: nextOps,
      composerAnchor: null,
    }));
    sendMessage({ type: "add_thread", opId, side, line, body });
    setTimeout(() => {
      if (get().pendingOps.has(opId)) get().rollbackOp(opId, "Server did not acknowledge");
    }, 5000);
  },

  optimisticReply: (threadId, body) => {
    const { sendMessage, currentUserId, reviewers, threads, pendingOps } = get();
    if (!sendMessage) return;
    const target = threads[threadId];
    if (!target) return;
    const opId = newOpId();
    const tempCommentId = `${opId}-c`;
    const authorName = reviewers[currentUserId]?.name ?? currentUserId;
    const tempComment: Comment = {
      id: tempCommentId,
      authorId: currentUserId,
      authorName,
      body,
      createdAt: new Date().toISOString(),
    };
    const next = new Map(pendingOps);
    next.set(opId, { kind: "add_reply", threadId, tempCommentId });
    set((s) => ({
      threads: {
        ...s.threads,
        [threadId]: { ...target, comments: [...target.comments, tempComment] },
      },
      pendingOps: next,
    }));
    sendMessage({ type: "add_reply", opId, threadId, body });
    setTimeout(() => {
      if (get().pendingOps.has(opId)) get().rollbackOp(opId, "Server did not acknowledge");
    }, 5000);
  },

  optimisticResolve: (threadId, resolved) => {
    const { sendMessage, threads, pendingOps } = get();
    if (!sendMessage) return;
    const target = threads[threadId];
    if (!target || target.resolved === resolved) return;
    const opId = newOpId();
    const next = new Map(pendingOps);
    next.set(opId, { kind: "resolve", threadId, previousResolved: target.resolved });
    set((s) => ({
      threads: { ...s.threads, [threadId]: { ...target, resolved } },
      pendingOps: next,
    }));
    sendMessage({ type: "resolve", opId, threadId, resolved });
    setTimeout(() => {
      if (get().pendingOps.has(opId)) get().rollbackOp(opId, "Server did not acknowledge");
    }, 5000);
  },

  optimisticSetStatus: (status) => {
    const { sendMessage, currentUserId, reviewers, pendingOps } = get();
    if (!sendMessage) return;
    const me = reviewers[currentUserId];
    if (!me || me.status === status) return;
    const opId = newOpId();
    const next = new Map(pendingOps);
    next.set(opId, { kind: "set_status", userId: currentUserId, previousStatus: me.status });
    set((s) => ({
      reviewers: { ...s.reviewers, [currentUserId]: { ...me, status } },
      pendingOps: next,
    }));
    sendMessage({ type: "set_status", opId, status });
    setTimeout(() => {
      if (get().pendingOps.has(opId)) get().rollbackOp(opId, "Server did not acknowledge");
    }, 5000);
  },

  applyServerEvent: (msg) => {
    switch (msg.type) {
      case "bootstrap": {
        const reviewers: Record<string, Reviewer> = {};
        for (const r of msg.reviewers) reviewers[r.id] = r;
        const threads: Record<string, Thread> = {};
        let index: Record<string, string[]> = {};
        for (const t of msg.threads) {
          threads[t.id] = t;
          index = indexThread(index, t);
        }
        set({ reviewers, threads, threadsByAnchor: index });
        return;
      }
      case "thread_added": {
        set((s) => {
          let threads = s.threads;
          let index = s.threadsByAnchor;
          let pending = s.pendingOps;
          if (msg.opId) {
            const op = pending.get(msg.opId);
            if (op && op.kind === "add_thread") {
              const temp = threads[op.tempThreadId];
              if (temp) {
                index = removeFromIndex(index, op.tempThreadId, temp.anchor.side, temp.anchor.line);
                const nextThreads = { ...threads };
                delete nextThreads[op.tempThreadId];
                threads = nextThreads;
              }
              pending = new Map(pending);
              pending.delete(msg.opId);
            }
          }
          threads = { ...threads, [msg.thread.id]: msg.thread };
          index = indexThread(index, msg.thread);
          return { threads, threadsByAnchor: index, pendingOps: pending };
        });
        return;
      }
      case "reply_added": {
        set((s) => {
          let threads = s.threads;
          let pending = s.pendingOps;
          const target = threads[msg.threadId];
          if (!target) return s;
          let comments = target.comments;
          if (msg.opId) {
            const op = pending.get(msg.opId);
            if (op && op.kind === "add_reply") {
              comments = comments.filter((c) => c.id !== op.tempCommentId);
              pending = new Map(pending);
              pending.delete(msg.opId);
            }
          }
          if (!comments.some((c) => c.id === msg.comment.id)) {
            comments = [...comments, msg.comment];
          }
          return {
            threads: { ...threads, [msg.threadId]: { ...target, comments } },
            pendingOps: pending,
          };
        });
        return;
      }
      case "resolve_changed": {
        set((s) => {
          const target = s.threads[msg.threadId];
          if (!target) return s;
          let pending = s.pendingOps;
          if (msg.opId && pending.has(msg.opId)) {
            pending = new Map(pending);
            pending.delete(msg.opId);
          }
          return {
            threads: { ...s.threads, [msg.threadId]: { ...target, resolved: msg.resolved } },
            pendingOps: pending,
          };
        });
        return;
      }
      case "status_changed": {
        set((s) => {
          let pending = s.pendingOps;
          if (msg.opId && pending.has(msg.opId)) {
            pending = new Map(pending);
            pending.delete(msg.opId);
          }
          const existing = s.reviewers[msg.userId];
          const reviewer: Reviewer = existing
            ? { ...existing, status: msg.status }
            : { id: msg.userId, name: msg.userId, status: msg.status };
          return { reviewers: { ...s.reviewers, [msg.userId]: reviewer }, pendingOps: pending };
        });
        return;
      }
      case "reject": {
        get().rollbackOp(msg.opId, msg.reason);
        return;
      }
    }
  },

  rollbackOp: (opId, reason) => {
    const op = get().pendingOps.get(opId);
    if (!op) return;
    set((s) => {
      const pending = new Map(s.pendingOps);
      pending.delete(opId);
      switch (op.kind) {
        case "add_thread": {
          const temp = s.threads[op.tempThreadId];
          if (!temp) return { pendingOps: pending };
          const threads = { ...s.threads };
          delete threads[op.tempThreadId];
          const index = removeFromIndex(
            s.threadsByAnchor,
            op.tempThreadId,
            temp.anchor.side,
            temp.anchor.line,
          );
          return { threads, threadsByAnchor: index, pendingOps: pending };
        }
        case "add_reply": {
          const target = s.threads[op.threadId];
          if (!target) return { pendingOps: pending };
          return {
            threads: {
              ...s.threads,
              [op.threadId]: {
                ...target,
                comments: target.comments.filter((c) => c.id !== op.tempCommentId),
              },
            },
            pendingOps: pending,
          };
        }
        case "resolve": {
          const target = s.threads[op.threadId];
          if (!target) return { pendingOps: pending };
          return {
            threads: {
              ...s.threads,
              [op.threadId]: { ...target, resolved: op.previousResolved },
            },
            pendingOps: pending,
          };
        }
        case "set_status": {
          const reviewer = s.reviewers[op.userId];
          if (!reviewer) return { pendingOps: pending };
          return {
            reviewers: {
              ...s.reviewers,
              [op.userId]: { ...reviewer, status: op.previousStatus },
            },
            pendingOps: pending,
          };
        }
      }
    });
    get().pushToast(`Couldn't save change: ${reason}`);
  },
}));
