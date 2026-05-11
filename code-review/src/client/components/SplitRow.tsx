import { LineCell } from "./LineCell.js";
import type { SplitPair } from "../lib/diffParser.js";
import type { Side } from "../../shared/types.js";
import styles from "../styles/SplitRow.module.css";

interface SplitRowProps {
  readonly pair: SplitPair;
  readonly hasThreadsOld: boolean;
  readonly hasThreadsNew: boolean;
  readonly onClickLine: (side: Side, line: number) => void;
}

export function SplitRow({
  pair,
  hasThreadsOld,
  hasThreadsNew,
  onClickLine,
}: SplitRowProps): JSX.Element {
  if (pair.kind === "hunk") {
    return (
      <div className={styles.row} data-kind="hunk">
        <span className={styles.hunk}>{pair.oldRow?.text ?? ""}</span>
      </div>
    );
  }
  return (
    <div className={styles.row} data-kind={pair.kind}>
      <LineCell
        row={pair.oldRow}
        side="old"
        hasThreads={hasThreadsOld}
        onClickLine={onClickLine}
      />
      <LineCell
        row={pair.newRow}
        side="new"
        hasThreads={hasThreadsNew}
        onClickLine={onClickLine}
      />
    </div>
  );
}
