import { useState } from "react";
import type { Thread } from "../../shared/types.js";
import { useReviewStore } from "../store/reviewStore.js";
import { CommentItem } from "./CommentItem.js";
import { Composer } from "./Composer.js";
import styles from "../styles/ThreadCard.module.css";

interface ThreadCardProps {
  readonly thread: Thread;
}

export function ThreadCard({ thread }: ThreadCardProps): JSX.Element {
  const [replyOpen, setReplyOpen] = useState(false);
  const optimisticReply = useReviewStore((s) => s.optimisticReply);
  const optimisticResolve = useReviewStore((s) => s.optimisticResolve);
  const isExpanded = useReviewStore((s) => s.expandedResolved.has(thread.id));
  const toggleExpansion = useReviewStore((s) => s.toggleResolvedExpansion);

  const collapsed = thread.resolved && !isExpanded;

  if (collapsed) {
    return (
      <div className={styles.card} data-resolved="true">
        <button
          type="button"
          className={styles.collapsedSummary}
          onClick={() => toggleExpansion(thread.id)}
        >
          <span>✓ Resolved thread · {thread.comments.length} comments</span>
          <span className={styles.expandHint}>Click to expand</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card} data-resolved={thread.resolved ? "true" : "false"}>
      <div className={styles.head}>
        <span className={styles.label}>
          {thread.resolved ? "Resolved thread" : "Thread"}
        </span>
        <div className={styles.headActions}>
          {thread.resolved ? (
            <button
              type="button"
              className={styles.action}
              onClick={() => toggleExpansion(thread.id)}
            >
              Collapse
            </button>
          ) : null}
          <button
            type="button"
            className={styles.action}
            onClick={() => optimisticResolve(thread.id, !thread.resolved)}
          >
            {thread.resolved ? "Reopen" : "Resolve"}
          </button>
        </div>
      </div>
      <div className={styles.comments}>
        {thread.comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </div>
      {replyOpen ? (
        <Composer
          autoFocus
          placeholder="Write a reply…"
          submitLabel="Reply"
          onCancel={() => setReplyOpen(false)}
          onSubmit={(body) => {
            optimisticReply(thread.id, body);
            setReplyOpen(false);
          }}
        />
      ) : (
        <button type="button" className={styles.replyBtn} onClick={() => setReplyOpen(true)}>
          Reply
        </button>
      )}
    </div>
  );
}
