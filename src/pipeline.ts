import { DiagnosticError } from "./diagnostics/diagnostic";
import type { Diagnostic } from "./diagnostics/diagnostic";
import { SourceFile } from "./frontend/source-file";
import { parse } from "./frontend/parser";
import { desugar } from "./desugar/desugar";
import { resolve } from "./semantic/resolver";
import { TypeChecker } from "./semantic/type-checker";
import type { CheckedProgram } from "./semantic/type-checker";
import { Interpreter } from "./interpreter/interpreter";
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly diagnostic: Diagnostic };
export function check(source: SourceFile): Result<CheckedProgram> {
  const parsed = parse(source);
  if (!parsed.ok) return parsed;
  try {
    const core = desugar(parsed.program);
    return { ok: true, value: new TypeChecker(resolve(core)).check(core) };
  } catch (error: unknown) {
    if (error instanceof DiagnosticError) return { ok: false, diagnostic: error.diagnostic };
    throw error;
  }
}
export function run(source: SourceFile, output: (text: string) => void): Result<void> {
  const checked = check(source);
  if (!checked.ok) return checked;
  try { new Interpreter(checked.value, output).run(); return { ok: true, value: undefined }; }
  catch (error: unknown) {
    if (error instanceof DiagnosticError) return { ok: false, diagnostic: error.diagnostic };
    throw error;
  }
}
