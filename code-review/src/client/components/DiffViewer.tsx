import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDiff } from "../hooks/useBootstrap.js";
import { parseDiff, toSplitPairs, type DiffRow, type SplitPair } from "../lib/diffParser.js";
import { useReviewStore } from "../store/reviewStore.js";
import { RowBlock } from "./RowBlock.js";
import styles from "../styles/DiffViewer.module.css";

const VIRTUALIZE_THRESHOLD = 300;
const ESTIMATED_ROW_HEIGHT = 22;

interface VirtualPaneProps<T> {
  readonly items: ReadonlyArray<T>;
  readonly renderItem: (item: T, index: number) => JSX.Element;
}

function VirtualPane<T>({ items, renderItem }: VirtualPaneProps<T>): JSX.Element {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 12,
  });
  return (
    <div ref={parentRef} className={styles.virtualScroll}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const item = items[v.index];
          if (item === undefined) return null;
          return (
            <div
              key={v.key}
              ref={virtualizer.measureElement}
              data-index={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${v.start}px)`,
              }}
            >
              {renderItem(item, v.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DiffViewer(): JSX.Element {
  const { data, isLoading, isError } = useDiff();
  const viewMode = useReviewStore((s) => s.viewMode);

  const rows: DiffRow[] = useMemo(() => {
    if (!data) return [];
    return parseDiff(data.diff, data.language);
  }, [data]);

  const splitPairs: SplitPair[] = useMemo(() => toSplitPairs(rows), [rows]);

  if (isLoading) return <div className={styles.message}>Loading diff…</div>;
  if (isError || !data) return <div className={styles.message}>Failed to load diff.</div>;

  const items: ReadonlyArray<DiffRow | SplitPair> = viewMode === "split" ? splitPairs : rows;
  const shouldVirtualize = items.length > VIRTUALIZE_THRESHOLD;

  const renderItem = (item: DiffRow | SplitPair): JSX.Element =>
    viewMode === "split" ? (
      <RowBlock variant="split" pair={item as SplitPair} />
    ) : (
      <RowBlock variant="unified" row={item as DiffRow} />
    );

  return (
    <div className={styles.viewer} data-view={viewMode}>
      {shouldVirtualize ? (
        <VirtualPane items={items} renderItem={renderItem} />
      ) : (
        <div className={styles.flat}>
          {items.map((it, i) => (
            <div key={i}>{renderItem(it)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
