import { useState } from "react";
import type { Side } from "../../shared/types.js";
import type { DiffRow } from "../lib/diff.js";
import { useReviewStore } from "../store/reviewStore.js";
import { CommentThread } from "./CommentThread.js";
import { LineComposer } from "./LineComposer.js";
import styles from "../styles/DiffLine.module.css";

interface Props {
  readonly row: DiffRow | null;
  readonly side: Side;
}

export function DiffLine({ row, side }: Props): JSX.Element {
  const [composing, setComposing] = useState(false);
  const threadIds = useReviewStore((state) => {
    const line = side === "old" ? row?.oldLine : row?.newLine;
    return line ? state.threadsByLine[`${side}:${line}`] ?? [] : [];
  });
  const threads = useReviewStore((state) => threadIds.map((id) => state.threads[id]).filter((thread): thread is NonNullable<typeof thread> => Boolean(thread)));
  const line = side === "old" ? row?.oldLine : row?.newLine;
  const canComment = row !== null && line !== null && row.kind !== "hunk";

  return (
    <div className={`${styles.line} ${row ? styles[row.kind] : styles.empty}`}>
      <button type="button" disabled={!canComment} className={styles.gutter} onClick={() => setComposing(true)}>
        {line ?? ""}
      </button>
      <code dangerouslySetInnerHTML={{ __html: row?.html ?? "" }} />
      {canComment && composing && typeof line === "number" ? <LineComposer side={side} line={line} onClose={() => setComposing(false)} /> : null}
      {threads.map((thread) => (
        <CommentThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
