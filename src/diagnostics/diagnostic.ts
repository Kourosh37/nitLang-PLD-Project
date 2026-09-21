import type { SourceSpan } from "../frontend/source-span";
import type { SourceFile } from "../frontend/source-file";

export type DiagnosticCategory = "Syntax Error" | "Type Error" | "Runtime Error";

export interface Diagnostic {
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly span: SourceSpan;
  readonly notes?: readonly string[];
}

/** Internal phase unwinding; public phase APIs return structured diagnostics. */
export class DiagnosticError extends Error {
  constructor(public readonly diagnostic: Diagnostic) {
    super(diagnostic.message);
    this.name = "DiagnosticError";
  }
}

export function formatDiagnostic(diagnostic: Diagnostic, source?: SourceFile): string {
  const { sourceName, start } = diagnostic.span;
  const heading = `${sourceName}:${start.line}:${start.column}: ${diagnostic.category}: ${diagnostic.message}`;
  const detail: string[] = [];
  if (source !== undefined && source.name === sourceName) {
    const line = source.lineText(start.line);
    const width = diagnostic.span.end.line === start.line ? Math.max(1, diagnostic.span.end.column - start.column) : 1;
    detail.push(`  ${line}`, `  ${" ".repeat(start.column - 1)}${"^".repeat(width)}`);
  }
  return [heading, ...detail, ...(diagnostic.notes ?? []).map((note) => `  note: ${note}`)].join("\n");
}
