import { useReviewStore } from "../store/reviewStore.js";
import { deriveOverallStatus } from "../../shared/types.js";
import { ReviewerBadge } from "./ReviewerBadge.js";
import styles from "../styles/Header.module.css";

const WS_LABEL: Record<string, string> = {
  open: "Live",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  closed: "Disconnected",
};

export function Header(): JSX.Element {
  const reviewers = useReviewStore((s) => s.reviewers);
  const wsStatus = useReviewStore((s) => s.wsStatus);
  const currentUserId = useReviewStore((s) => s.currentUserId);
  const setCurrentUser = useReviewStore((s) => s.setCurrentUser);

  const reviewerList = Object.values(reviewers);
  const overall = deriveOverallStatus(reviewerList);
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.title}>LruCache.ts</span>
        <span className={styles.subtitle}>PR #42 · Add hit/miss tracking</span>
      </div>
      <div className={styles.middle}>
        <span className={styles.overall} data-status={overall}>
          {overall === "blocked"
            ? "Changes Requested"
            : overall === "approved"
              ? "Approved"
              : "Pending review"}
        </span>
      </div>
      <div className={styles.right}>
        <span className={styles.wsStatus} data-status={wsStatus}>
          <span className={styles.wsDot} /> {WS_LABEL[wsStatus] ?? wsStatus}
        </span>
        <div className={styles.users}>
          {reviewerList.map((r) => (
            <ReviewerBadge key={r.id} reviewer={r} />
          ))}
        </div>
        <label className={styles.switcher}>
          <span>Act as</span>
          <select value={currentUserId} onChange={(e) => setCurrentUser(e.target.value)}>
            <option value="alice">Alice</option>
            <option value="bob">Bob</option>
          </select>
        </label>
      </div>
    </header>
  );
}
