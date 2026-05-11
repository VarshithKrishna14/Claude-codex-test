import { useState } from "react";
import type { Thread } from "../../shared/types.js";
import { useReviewStore } from "../store/reviewStore.js";
import styles from "../styles/CommentThread.module.css";

interface Props {
  readonly thread: Thread;
}

export function CommentThread({ thread }: Props): JSX.Element {
  const [reply, setReply] = useState("");
  const addReply = useReviewStore((state) => state.addReply);
  const setResolved = useReviewStore((state) => state.setResolved);
  const expanded = useReviewStore((state) => state.expandedResolved[thread.id] ?? false);
  const toggle = useReviewStore((state) => state.toggleResolved);
  const hidden = thread.resolved && !expanded;

  return (
    <section className={styles.thread}>
      <div className={styles.threadHeader}>
        <strong>{thread.resolved ? "Resolved thread" : "Thread"}</strong>
        <button type="button" onClick={() => (thread.resolved ? toggle(thread.id) : setResolved(thread.id, true))}>
          {thread.resolved ? (expanded ? "Collapse" : "Expand") : "Resolve"}
        </button>
        {thread.resolved ? <button type="button" onClick={() => setResolved(thread.id, false)}>Unresolve</button> : null}
      </div>
      {hidden ? null : (
        <>
          {thread.comments.map((comment) => (
            <article key={comment.id} className={styles.comment}>
              <div>
                <strong>{comment.authorName}</strong>
                <time>{new Date(comment.createdAt).toLocaleTimeString()}</time>
              </div>
              <p>{comment.body}</p>
            </article>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (reply.trim()) {
                addReply(thread.id, reply.trim());
                setReply("");
              }
            }}
          >
            <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply..." />
            <button type="submit">Reply</button>
          </form>
        </>
      )}
    </section>
  );
}
