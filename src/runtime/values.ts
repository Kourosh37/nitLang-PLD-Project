import { DiagnosticError } from "../diagnostics/diagnostic";
import type { SourceSpan } from "../frontend/source-span";

export interface IntValue { readonly kind: "int"; readonly value: number }
export interface BoolValue { readonly kind: "bool"; readonly value: boolean }
export interface StringValue { readonly kind: "string"; readonly value: string }
export interface VoidValue { readonly kind: "void" }

export type PrimitiveValue = IntValue | BoolValue | StringValue;
/** Later milestones extend this union with closures, lists, references and objects. */
export type RuntimeValue = PrimitiveValue | VoidValue;

export const MIN_INT = -Number.MAX_SAFE_INTEGER;
export const MAX_INT = Number.MAX_SAFE_INTEGER;
export const VOID: VoidValue = Object.freeze({ kind: "void" });
const TRUE: BoolValue = Object.freeze({ kind: "bool", value: true });
const FALSE: BoolValue = Object.freeze({ kind: "bool", value: false });

export function intValue(value: number, span: SourceSpan): IntValue {
  if (!Number.isSafeInteger(value)) {
    throw new DiagnosticError({ category: "Runtime Error", message: "Expected an integer within the safe integer range.", span });
  }
  return Object.freeze({ kind: "int", value: value === 0 ? 0 : value });
}

export function boolValue(value: boolean): BoolValue {
  return value ? TRUE : FALSE;
}

export function stringValue(value: string): StringValue {
  return Object.freeze({ kind: "string", value });
}
