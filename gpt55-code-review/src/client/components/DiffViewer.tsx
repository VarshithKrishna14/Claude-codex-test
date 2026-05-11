import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { parseDiff, toSplitRows, type DiffRow, type SplitRow } from "../lib/diff.js";
import { useReviewStore } from "../store/reviewStore.js";
import { DiffLine } from "./DiffLine.js";
import styles from "../styles/DiffViewer.module.css";

const VIRTUAL_THRESHOLD = 300;

interface Props {
  readonly diff: string;
  readonly language: string;
}

function SplitDiff({ row }: { readonly row: SplitRow }): JSX.Element {
  if (row.kind === "hunk") return <div className={styles.hunk}>{row.oldRow?.text}</div>;
  return (
    <div className={styles.splitRow}>
      <DiffLine row={row.oldRow} side="old" />
      <DiffLine row={row.newRow} side="new" />
    </div>
  );
}

function UnifiedDiff({ row }: { readonly row: DiffRow }): JSX.Element {
  if (row.kind === "hunk") return <div className={styles.hunk}>{row.text}</div>;
  return <DiffLine row={row} side={row.kind === "del" ? "old" : "new"} />;
}

export function DiffViewer({ diff, language }: Props): JSX.Element {
  const viewMode = useReviewStore((state) => state.viewMode);
  const rows = useMemo(() => parseDiff(diff, language), [diff, language]);
  const splitRows = useMemo(() => toSplitRows(rows), [rows]);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const items = viewMode === "split" ? splitRows : rows;
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 16,
    enabled: items.length > VIRTUAL_THRESHOLD,
  });

  if (items.length <= VIRTUAL_THRESHOLD) {
    return (
      <section className={styles.viewer}>
        {viewMode === "split"
          ? splitRows.map((row, index) => <SplitDiff key={index} row={row} />)
          : rows.map((row, index) => <UnifiedDiff key={index} row={row} />)}
      </section>
    );
  }

  return (
    <section ref={parentRef} className={styles.virtual}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = items[item.index];
          if (!row) return null;
          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{ position: "absolute", transform: `translateY(${item.start}px)`, width: "100%" }}
            >
              {viewMode === "split" ? <SplitDiff row={row as SplitRow} /> : <UnifiedDiff row={row as DiffRow} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
