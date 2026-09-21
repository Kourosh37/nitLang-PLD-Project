import { DiagnosticError } from "./diagnostics/diagnostic";
import type { Diagnostic } from "./diagnostics/diagnostic";
import { SourceFile } from "./frontend/source-file";
import { parse } from "./frontend/parser";
import { desugar } from "./desugar/desugar";
import { resolve } from "./semantic/resolver";
import { TypeChecker } from "./semantic/type-checker";
import type { CheckedProgram } from "./semantic/type-checker";
import { Interpreter } from "./interpreter/interpreter";
import { ControlSignal } from "./runtime/completion";
import { formatPrimitive } from "./runtime/primitive-operations";
import { compile } from "./bytecode/compiler";
import type { Chunk } from "./bytecode/chunk";
import { VirtualMachine } from "./vm/vm";
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostic: Diagnostic };
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
  try {
    new Interpreter(checked.value, output).run();
    return { ok: true, value: undefined };
  } catch (error: unknown) {
    if (error instanceof DiagnosticError) return { ok: false, diagnostic: error.diagnostic };
    if (error instanceof ControlSignal && error.kind === "throw")
      return {
        ok: false,
        diagnostic: {
          category: "Runtime Error",
          message: `Uncaught exception: ${formatPrimitive(error.value, error.span)}`,
          span: error.span,
        },
      };
    throw error;
  }
}
export function bytecode(source: SourceFile): Result<Chunk> {
  const checked = check(source);
  if (!checked.ok) return checked;
  try {
    return { ok: true, value: compile(checked.value) };
  } catch (error: unknown) {
    if (error instanceof DiagnosticError) return { ok: false, diagnostic: error.diagnostic };
    throw error;
  }
}
export function runVm(source: SourceFile, output: (text: string) => void): Result<void> {
  const compiled = bytecode(source);
  if (!compiled.ok) return compiled;
  try {
    new VirtualMachine(compiled.value, output).run();
    return { ok: true, value: undefined };
  } catch (error: unknown) {
    if (error instanceof DiagnosticError) return { ok: false, diagnostic: error.diagnostic };
    throw error;
  }
}
