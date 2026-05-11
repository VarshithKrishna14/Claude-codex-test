import { useEffect } from "react";
import { useReviewStore } from "../store/reviewStore.js";
import styles from "../styles/ToastHost.module.css";

export function ToastHost(): JSX.Element {
  const toasts = useReviewStore((state) => state.toasts);
  const removeToast = useReviewStore((state) => state.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => removeToast(toast.id), 3500));
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [toasts, removeToast]);

  return (
    <aside className={styles.host}>
      {toasts.map((toast) => (
        <button key={toast.id} type="button" onClick={() => removeToast(toast.id)}>
          {toast.message}
        </button>
      ))}
    </aside>
  );
}
