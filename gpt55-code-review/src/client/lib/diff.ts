import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);

export type RowKind = "hunk" | "context" | "add" | "del";

export interface DiffRow {
  readonly kind: RowKind;
  readonly oldLine: number | null;
  readonly newLine: number | null;
  readonly text: string;
  readonly html: string;
}

export interface SplitRow {
  readonly kind: "hunk" | "context" | "add" | "del" | "modify";
  readonly oldRow: DiffRow | null;
  readonly newRow: DiffRow | null;
}

const HUNK = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightLine(text: string, language: string): string {
  try {
    return hljs.highlight(text, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(text);
  }
}

export function parseDiff(diff: string, language: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const raw of diff.split(/\r?\n/)) {
    if (raw.length === 0) continue;
    if (raw.startsWith("@@")) {
      const match = HUNK.exec(raw);
      if (match) {
        oldLine = Number.parseInt(match[1] ?? "1", 10) - 1;
        newLine = Number.parseInt(match[2] ?? "1", 10) - 1;
      }
      rows.push({ kind: "hunk", oldLine: null, newLine: null, text: raw, html: escapeHtml(raw) });
    } else if (raw.startsWith("+")) {
      newLine += 1;
      const text = raw.slice(1);
      rows.push({ kind: "add", oldLine: null, newLine, text, html: highlightLine(text, language) });
    } else if (raw.startsWith("-")) {
      oldLine += 1;
      const text = raw.slice(1);
      rows.push({ kind: "del", oldLine, newLine: null, text, html: highlightLine(text, language) });
    } else {
      oldLine += 1;
      newLine += 1;
      const text = raw.startsWith(" ") ? raw.slice(1) : raw;
      rows.push({ kind: "context", oldLine, newLine, text, html: highlightLine(text, language) });
    }
  }

  return rows;
}

export function toSplitRows(rows: readonly DiffRow[]): SplitRow[] {
  const output: SplitRow[] = [];
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    if (!row) break;
    if (row.kind === "hunk") {
      output.push({ kind: "hunk", oldRow: row, newRow: row });
      index += 1;
      continue;
    }
    if (row.kind === "context") {
      output.push({ kind: "context", oldRow: row, newRow: row });
      index += 1;
      continue;
    }
    const deleted: DiffRow[] = [];
    const added: DiffRow[] = [];
    while (index < rows.length && rows[index]?.kind === "del") {
      deleted.push(rows[index] as DiffRow);
      index += 1;
    }
    while (index < rows.length && rows[index]?.kind === "add") {
      added.push(rows[index] as DiffRow);
      index += 1;
    }
    const count = Math.max(deleted.length, added.length);
    for (let i = 0; i < count; i += 1) {
      const oldRow = deleted[i] ?? null;
      const newRow = added[i] ?? null;
      output.push({ kind: oldRow && newRow ? "modify" : oldRow ? "del" : "add", oldRow, newRow });
    }
  }
  return output;
}
