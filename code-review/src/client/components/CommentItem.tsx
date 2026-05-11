import type { Comment } from "../../shared/types.js";
import styles from "../styles/CommentItem.module.css";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleString();
}

export function CommentItem({ comment }: { comment: Comment }): JSX.Element {
  return (
    <div className={styles.item}>
      <div className={styles.head}>
        <span className={styles.author}>{comment.authorName}</span>
        <span className={styles.time}>{formatTimestamp(comment.createdAt)}</span>
      </div>
      <div className={styles.body}>{comment.body}</div>
    </div>
  );
}
