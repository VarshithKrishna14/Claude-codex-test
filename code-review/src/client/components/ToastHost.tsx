import { useEffect } from "react";
import { useReviewStore } from "../store/reviewStore.js";
import styles from "../styles/ToastHost.module.css";

const TOAST_LIFETIME_MS = 4500;

export function ToastHost(): JSX.Element {
  const toasts = useReviewStore((s) => s.toasts);
  const dismiss = useReviewStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismiss(t.id), TOAST_LIFETIME_MS),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [toasts, dismiss]);

  if (toasts.length === 0) return <></>;
  return (
    <div className={styles.host} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast}>
          <span>{t.message}</span>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
