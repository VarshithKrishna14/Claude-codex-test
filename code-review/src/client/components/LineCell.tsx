import type { DiffRow } from "../lib/diffParser.js";
import type { Side } from "../../shared/types.js";
import styles from "../styles/LineCell.module.css";

interface LineCellProps {
  readonly row: DiffRow | null;
  readonly side: Side;
  readonly hasThreads: boolean;
  readonly onClickLine: (side: Side, line: number) => void;
}

function gutterNumber(row: DiffRow | null, side: Side): string {
  if (!row) return "";
  if (row.kind === "hunk") return "";
  if (side === "old") return row.oldLineNo === null ? "" : String(row.oldLineNo);
  return row.newLineNo === null ? "" : String(row.newLineNo);
}

function prefix(row: DiffRow | null, side: Side): string {
  if (!row) return " ";
  if (row.kind === "hunk") return " ";
  if (row.kind === "context") return " ";
  if (side === "old" && row.kind === "del") return "-";
  if (side === "new" && row.kind === "add") return "+";
  return " ";
}

function lineNumberForSide(row: DiffRow, side: Side): number | null {
  return side === "old" ? row.oldLineNo : row.newLineNo;
}

export function LineCell({ row, side, hasThreads, onClickLine }: LineCellProps): JSX.Element {
  const kind = row?.kind ?? "empty";
  const number = gutterNumber(row, side);
  const isClickable =
    row !== null && row.kind !== "hunk" && lineNumberForSide(row, side) !== null;
  return (
    <div className={styles.cell} data-kind={kind} data-side={side}>
      <button
        type="button"
        className={styles.gutter}
        aria-label={`Comment on line ${number || ""}`}
        disabled={!isClickable}
        onClick={() => {
          if (!row || !isClickable) return;
          const lineNo = lineNumberForSide(row, side);
          if (lineNo === null) return;
          onClickLine(side, lineNo);
        }}
      >
        <span className={styles.lineNo}>{number}</span>
        <span className={styles.threadDot} data-active={hasThreads ? "true" : "false"} />
      </button>
      <span className={styles.sign}>{prefix(row, side)}</span>
      <code
        className={styles.code}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: row?.html ?? "" }}
      />
    </div>
  );
}
