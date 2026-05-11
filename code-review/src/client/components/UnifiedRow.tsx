import type { DiffRow } from "../lib/diffParser.js";
import type { Side } from "../../shared/types.js";
import styles from "../styles/UnifiedRow.module.css";

interface UnifiedRowProps {
  readonly row: DiffRow;
  readonly hasThreadsOld: boolean;
  readonly hasThreadsNew: boolean;
  readonly onClickLine: (side: Side, line: number) => void;
}

function rowSide(row: DiffRow): Side {
  return row.kind === "del" ? "old" : "new";
}

export function UnifiedRow({
  row,
  hasThreadsOld,
  hasThreadsNew,
  onClickLine,
}: UnifiedRowProps): JSX.Element {
  if (row.kind === "hunk") {
    return (
      <div className={styles.row} data-kind="hunk">
        <span className={styles.hunk}>{row.text}</span>
      </div>
    );
  }
  const side = rowSide(row);
  const hasThreads = side === "old" ? hasThreadsOld : hasThreadsNew;
  const lineNo = side === "old" ? row.oldLineNo : row.newLineNo;
  const sign = row.kind === "add" ? "+" : row.kind === "del" ? "-" : " ";
  return (
    <div className={styles.row} data-kind={row.kind}>
      <button
        type="button"
        className={styles.gutterOld}
        disabled={row.oldLineNo === null}
        onClick={() => {
          if (row.oldLineNo !== null) onClickLine("old", row.oldLineNo);
        }}
        aria-label={`Comment on old line ${row.oldLineNo ?? ""}`}
      >
        {row.oldLineNo ?? ""}
      </button>
      <button
        type="button"
        className={styles.gutterNew}
        disabled={row.newLineNo === null}
        onClick={() => {
          if (row.newLineNo !== null) onClickLine("new", row.newLineNo);
        }}
        aria-label={`Comment on new line ${row.newLineNo ?? ""}`}
      >
        <span>{row.newLineNo ?? ""}</span>
        <span
          className={styles.threadDot}
          data-active={(side === "new" ? hasThreadsNew : hasThreads) ? "true" : "false"}
        />
        <span
          className={styles.threadDotOld}
          data-active={side === "old" && hasThreadsOld ? "true" : "false"}
          aria-hidden
        />
        {/* (Compact: any-side dot lights when threads exist on this row) */}
      </button>
      <span className={styles.sign}>{sign}</span>
      <code
        className={styles.code}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: row.html }}
        data-line={lineNo ?? ""}
      />
    </div>
  );
}
