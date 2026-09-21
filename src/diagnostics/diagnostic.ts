import type { SourceSpan } from "../frontend/source-span";

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

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const { sourceName, start } = diagnostic.span;
  const heading = `${sourceName}:${start.line}:${start.column}: ${diagnostic.category}: ${diagnostic.message}`;
  return [heading, ...(diagnostic.notes ?? []).map((note) => `  note: ${note}`)].join("\n");
}
