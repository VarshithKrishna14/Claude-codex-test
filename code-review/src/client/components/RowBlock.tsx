import { useReviewStore } from "../store/reviewStore.js";
import type { Side, Thread } from "../../shared/types.js";
import type { DiffRow, SplitPair } from "../lib/diffParser.js";
import { SplitRow } from "./SplitRow.js";
import { UnifiedRow } from "./UnifiedRow.js";
import { ThreadCard } from "./ThreadCard.js";
import { Composer } from "./Composer.js";
import styles from "../styles/RowBlock.module.css";

const anchorKey = (side: Side, line: number): string => `${side}:${line}`;

function threadsForAnchors(
  index: Record<string, string[]>,
  threads: Record<string, Thread>,
  anchors: ReadonlyArray<{ side: Side; line: number }>,
): Thread[] {
  const seen = new Set<string>();
  const out: Thread[] = [];
  for (const a of anchors) {
    const ids = index[anchorKey(a.side, a.line)];
    if (!ids) continue;
    for (const id of ids) {
      if (seen.has(id)) continue;
      const t = threads[id];
      if (!t) continue;
      seen.add(id);
      out.push(t);
    }
  }
  return out;
}

interface RowBlockProps {
  readonly variant: "split";
  readonly pair: SplitPair;
}
interface UnifiedRowBlockProps {
  readonly variant: "unified";
  readonly row: DiffRow;
}

export function RowBlock(props: RowBlockProps | UnifiedRowBlockProps): JSX.Element {
  const threads = useReviewStore((s) => s.threads);
  const index = useReviewStore((s) => s.threadsByAnchor);
  const composerAnchor = useReviewStore((s) => s.composerAnchor);
  const openComposer = useReviewStore((s) => s.openComposer);
  const closeComposer = useReviewStore((s) => s.closeComposer);
  const optimisticAddThread = useReviewStore((s) => s.optimisticAddThread);

  let anchors: { side: Side; line: number }[];
  let rowEl: JSX.Element;
  let hasThreadsOld = false;
  let hasThreadsNew = false;

  if (props.variant === "split") {
    anchors = [];
    if (props.pair.oldRow?.oldLineNo) {
      anchors.push({ side: "old", line: props.pair.oldRow.oldLineNo });
    }
    if (props.pair.newRow?.newLineNo) {
      anchors.push({ side: "new", line: props.pair.newRow.newLineNo });
    }
    hasThreadsOld =
      props.pair.oldRow?.oldLineNo !== undefined &&
      props.pair.oldRow?.oldLineNo !== null &&
      (index[anchorKey("old", props.pair.oldRow.oldLineNo)]?.length ?? 0) > 0;
    hasThreadsNew =
      props.pair.newRow?.newLineNo !== undefined &&
      props.pair.newRow?.newLineNo !== null &&
      (index[anchorKey("new", props.pair.newRow.newLineNo)]?.length ?? 0) > 0;
    rowEl = (
      <SplitRow
        pair={props.pair}
        hasThreadsOld={hasThreadsOld}
        hasThreadsNew={hasThreadsNew}
        onClickLine={openComposer}
      />
    );
  } else {
    const r = props.row;
    anchors = [];
    if (r.kind !== "hunk") {
      if (r.kind === "del" && r.oldLineNo) anchors.push({ side: "old", line: r.oldLineNo });
      if (r.kind !== "del" && r.newLineNo) anchors.push({ side: "new", line: r.newLineNo });
      if (r.kind === "context" && r.oldLineNo) anchors.push({ side: "old", line: r.oldLineNo });
    }
    hasThreadsOld =
      r.oldLineNo !== null && (index[anchorKey("old", r.oldLineNo)]?.length ?? 0) > 0;
    hasThreadsNew =
      r.newLineNo !== null && (index[anchorKey("new", r.newLineNo)]?.length ?? 0) > 0;
    rowEl = (
      <UnifiedRow
        row={r}
        hasThreadsOld={hasThreadsOld}
        hasThreadsNew={hasThreadsNew}
        onClickLine={openComposer}
      />
    );
  }

  const rowThreads = threadsForAnchors(index, threads, anchors);
  const composerHere =
    composerAnchor !== null &&
    anchors.some(
      (a) => a.side === composerAnchor.side && a.line === composerAnchor.line,
    );

  return (
    <div className={styles.block}>
      {rowEl}
      {(rowThreads.length > 0 || composerHere) && (
        <div className={styles.attachments}>
          {rowThreads.map((t) => (
            <ThreadCard key={t.id} thread={t} />
          ))}
          {composerHere && composerAnchor ? (
            <Composer
              autoFocus
              placeholder={`Comment on ${composerAnchor.side} line ${composerAnchor.line}…`}
              submitLabel="Comment"
              onCancel={closeComposer}
              onSubmit={(body) => {
                optimisticAddThread(composerAnchor.side, composerAnchor.line, body);
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
