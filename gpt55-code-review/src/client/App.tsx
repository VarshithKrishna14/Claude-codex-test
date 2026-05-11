import { useEffect } from "react";
import { Header } from "./components/Header.js";
import { DiffToolbar } from "./components/DiffToolbar.js";
import { DiffViewer } from "./components/DiffViewer.js";
import { ToastHost } from "./components/ToastHost.js";
import { useReviewQuery } from "./hooks/useReviewQuery.js";
import { useReviewSocket } from "./hooks/useReviewSocket.js";
import { useReviewStore } from "./store/reviewStore.js";
import styles from "./styles/App.module.css";

export function App(): JSX.Element {
  const { data, isLoading, isError } = useReviewQuery();
  const hydrate = useReviewStore((state) => state.hydrate);
  useReviewSocket();

  useEffect(() => {
    if (data) hydrate(data.reviewers, data.threads);
  }, [data, hydrate]);

  return (
    <main className={styles.app}>
      <Header />
      <DiffToolbar />
      {isLoading ? <section className={styles.message}>Loading review...</section> : null}
      {isError ? <section className={styles.message}>Unable to load review data.</section> : null}
      {data ? <DiffViewer diff={data.diff} language={data.language} /> : null}
      <ToastHost />
    </main>
  );
}
