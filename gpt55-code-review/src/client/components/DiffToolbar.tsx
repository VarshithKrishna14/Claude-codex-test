import { useReviewStore } from "../store/reviewStore.js";
import styles from "../styles/DiffToolbar.module.css";

export function DiffToolbar(): JSX.Element {
  const viewMode = useReviewStore((state) => state.viewMode);
  const setViewMode = useReviewStore((state) => state.setViewMode);
  return (
    <nav className={styles.toolbar} aria-label="Diff controls">
      <button type="button" className={viewMode === "split" ? styles.active : ""} onClick={() => setViewMode("split")}>
        Side-by-side
      </button>
      <button type="button" className={viewMode === "unified" ? styles.active : ""} onClick={() => setViewMode("unified")}>
        Unified
      </button>
      <span>Syntax highlighted with highlight.js; virtualized after 300 rows.</span>
    </nav>
  );
}
