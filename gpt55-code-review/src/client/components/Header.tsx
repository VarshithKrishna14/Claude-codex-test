import { deriveOverallStatus, type ReviewerStatus } from "../../shared/types.js";
import { useReviewStore } from "../store/reviewStore.js";
import styles from "../styles/Header.module.css";

const labels: Record<ReviewerStatus, string> = {
  commented: "Commented",
  approved: "Approved",
  changes_requested: "Changes Requested",
};

export function Header(): JSX.Element {
  const reviewers = useReviewStore((state) => Object.values(state.reviewers));
  const currentReviewerId = useReviewStore((state) => state.currentReviewerId);
  const socketStatus = useReviewStore((state) => state.socketStatus);
  const setCurrentReviewer = useReviewStore((state) => state.setCurrentReviewer);
  const setReviewerStatus = useReviewStore((state) => state.setReviewerStatus);
  const current = reviewers.find((reviewer) => reviewer.id === currentReviewerId);
  const overall = deriveOverallStatus(reviewers);

  return (
    <header className={styles.header}>
      <div>
        <h1>TinyCache.ts</h1>
        <p>GPT-5.5 collaborative review · {socketStatus}</p>
      </div>
      <div className={styles.controls}>
        <span className={`${styles.overall} ${styles[overall]}`}>{overall}</span>
        <select value={currentReviewerId} onChange={(event) => setCurrentReviewer(event.target.value)}>
          {reviewers.map((reviewer) => (
            <option key={reviewer.id} value={reviewer.id}>
              {reviewer.name}
            </option>
          ))}
        </select>
        <select value={current?.status ?? "commented"} onChange={(event) => setReviewerStatus(event.target.value as ReviewerStatus)}>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
