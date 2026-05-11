import type { Reviewer } from "../../shared/types.js";
import styles from "../styles/ReviewerBadge.module.css";

const STATUS_LABEL: Record<Reviewer["status"], string> = {
  commented: "Commented",
  approved: "Approved",
  changes_requested: "Changes Requested",
};

export function ReviewerBadge({ reviewer }: { reviewer: Reviewer }): JSX.Element {
  return (
    <div className={styles.badge} data-status={reviewer.status}>
      <span className={styles.dot} aria-hidden />
      <span className={styles.name}>{reviewer.name}</span>
      <span className={styles.status}>{STATUS_LABEL[reviewer.status]}</span>
    </div>
  );
}
