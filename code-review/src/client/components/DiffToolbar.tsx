import { useReviewStore } from "../store/reviewStore.js";
import type { ReviewerStatus } from "../../shared/types.js";
import styles from "../styles/DiffToolbar.module.css";

const STATUS_OPTIONS: ReadonlyArray<{ value: ReviewerStatus; label: string }> = [
  { value: "commented", label: "Comment" },
  { value: "approved", label: "Approve" },
  { value: "changes_requested", label: "Request Changes" },
];

export function DiffToolbar(): JSX.Element {
  const viewMode = useReviewStore((s) => s.viewMode);
  const setViewMode = useReviewStore((s) => s.setViewMode);
  const optimisticSetStatus = useReviewStore((s) => s.optimisticSetStatus);
  const currentUserId = useReviewStore((s) => s.currentUserId);
  const myStatus = useReviewStore((s) => s.reviewers[currentUserId]?.status);

  return (
    <div className={styles.toolbar}>
      <div className={styles.viewToggle} role="tablist" aria-label="View mode">
        <button
          role="tab"
          aria-selected={viewMode === "split"}
          className={styles.tab}
          data-active={viewMode === "split"}
          type="button"
          onClick={() => setViewMode("split")}
        >
          Side-by-side
        </button>
        <button
          role="tab"
          aria-selected={viewMode === "unified"}
          className={styles.tab}
          data-active={viewMode === "unified"}
          type="button"
          onClick={() => setViewMode("unified")}
        >
          Unified
        </button>
      </div>
      <div className={styles.statusSet}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={styles.statusBtn}
            data-active={myStatus === opt.value}
            onClick={() => optimisticSetStatus(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
