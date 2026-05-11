import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);

export type DiffRowKind = "context" | "add" | "del" | "hunk";

export interface DiffRow {
  readonly kind: DiffRowKind;
  readonly oldLineNo: number | null;
  readonly newLineNo: number | null;
  readonly text: string;
  readonly html: string; // highlighted HTML for the line (without leading +/-)
}

export interface SplitPair {
  readonly oldRow: DiffRow | null;
  readonly newRow: DiffRow | null;
  readonly kind: "context" | "modify" | "add" | "del" | "hunk";
}

const HUNK_RE = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;

interface ParsedLine {
  readonly kind: DiffRowKind;
  readonly text: string;
}

function parseLines(diff: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const raw of diff.split(/\r?\n/)) {
    if (raw.length === 0) continue;
    if (raw.startsWith("@@")) {
      out.push({ kind: "hunk", text: raw });
    } else if (raw.startsWith("+")) {
      out.push({ kind: "add", text: raw.slice(1) });
    } else if (raw.startsWith("-")) {
      out.push({ kind: "del", text: raw.slice(1) });
    } else if (raw.startsWith(" ")) {
      out.push({ kind: "context", text: raw.slice(1) });
    } else {
      out.push({ kind: "context", text: raw });
    }
  }
  return out;
}

function highlightLines(lines: ReadonlyArray<string>, language: string): string[] {
  // hljs.highlight needs the whole source for accurate tokenization across lines.
  const joined = lines.join("\n");
  let highlighted: string;
  try {
    highlighted = hljs.highlight(joined, { language, ignoreIllegals: true }).value;
  } catch {
    highlighted = escapeHtml(joined);
  }
  return splitHighlightedByLine(highlighted, lines.length);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Splits hljs-rendered HTML into per-line fragments while keeping <span> tags
// balanced across newline boundaries.
function splitHighlightedByLine(html: string, expectedLineCount: number): string[] {
  const result: string[] = [];
  let cur = "";
  const openStack: string[] = [];
  let i = 0;
  while (i < html.length) {
    const ch = html[i];
    if (ch === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) {
        cur += html.slice(i);
        break;
      }
      const tag = html.slice(i, end + 1);
      if (tag.startsWith("</")) {
        openStack.pop();
      } else if (!tag.endsWith("/>")) {
        openStack.push(tag);
      }
      cur += tag;
      i = end + 1;
      continue;
    }
    if (ch === "\n") {
      // close open spans for this line
      cur += "</span>".repeat(openStack.length);
      result.push(cur);
      // reopen for next line
      cur = openStack.join("");
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.length > 0 || result.length < expectedLineCount) {
    cur += "</span>".repeat(openStack.length);
    result.push(cur);
  }
  while (result.length < expectedLineCount) result.push("");
  return result;
}

export function parseDiff(diffText: string, language: string): DiffRow[] {
  const parsed = parseLines(diffText);
  const codeLines = parsed.map((p) => (p.kind === "hunk" ? "" : p.text));
  const html = highlightLines(codeLines, language);

  const rows: DiffRow[] = [];
  let oldLine = 0;
  let newLine = 0;
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (!p) continue;
    const lineHtml = html[i] ?? escapeHtml(p.text);
    if (p.kind === "hunk") {
      const match = HUNK_RE.exec(p.text);
      if (match && match[1] && match[2]) {
        oldLine = Number.parseInt(match[1], 10) - 1;
        newLine = Number.parseInt(match[2], 10) - 1;
      }
      rows.push({ kind: "hunk", oldLineNo: null, newLineNo: null, text: p.text, html: lineHtml });
    } else if (p.kind === "context") {
      oldLine++;
      newLine++;
      rows.push({ kind: "context", oldLineNo: oldLine, newLineNo: newLine, text: p.text, html: lineHtml });
    } else if (p.kind === "add") {
      newLine++;
      rows.push({ kind: "add", oldLineNo: null, newLineNo: newLine, text: p.text, html: lineHtml });
    } else {
      oldLine++;
      rows.push({ kind: "del", oldLineNo: oldLine, newLineNo: null, text: p.text, html: lineHtml });
    }
  }
  return rows;
}

// Pair consecutive del/add runs for split view; emit context/hunk as their own pairs.
export function toSplitPairs(rows: ReadonlyArray<DiffRow>): SplitPair[] {
  const out: SplitPair[] = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (!r) {
      i++;
      continue;
    }
    if (r.kind === "context") {
      out.push({ oldRow: r, newRow: r, kind: "context" });
      i++;
      continue;
    }
    if (r.kind === "hunk") {
      out.push({ oldRow: r, newRow: r, kind: "hunk" });
      i++;
      continue;
    }
    // Collect a run of dels then adds
    const dels: DiffRow[] = [];
    const adds: DiffRow[] = [];
    while (i < rows.length) {
      const next = rows[i];
      if (!next) break;
      if (next.kind === "del") {
        dels.push(next);
        i++;
      } else if (next.kind === "add") {
        adds.push(next);
        i++;
      } else break;
    }
    const max = Math.max(dels.length, adds.length);
    for (let j = 0; j < max; j++) {
      const d = dels[j] ?? null;
      const a = adds[j] ?? null;
      let kind: SplitPair["kind"] = "context";
      if (d && a) kind = "modify";
      else if (a) kind = "add";
      else if (d) kind = "del";
      out.push({ oldRow: d, newRow: a, kind });
    }
  }
  return out;
}
