import { DiagnosticError } from "../diagnostics/diagnostic";
import type { SourceSpan } from "../frontend/source-span";
import type { PrimitiveBinaryOperator, UnaryOperator } from "../language/operators";
import { boolValue, intValue, MAX_INT, MIN_INT } from "./values";
import type { BoolValue, IntValue, PrimitiveValue, RuntimeValue } from "./values";

const MIN_EXACT_INT = BigInt(MIN_INT);
const MAX_EXACT_INT = BigInt(MAX_INT);

function fail(message: string, span: SourceSpan): never {
  throw new DiagnosticError({ category: "Runtime Error", message, span });
}

function requireInt(value: RuntimeValue, operator: string, span: SourceSpan): IntValue {
  if (value.kind !== "int") fail(`Operator '${operator}' requires int operands; received ${value.kind}.`, span);
  return value;
}

/** Conditions must not use host truthiness. The checker enforces this statically too. */
export function requireBoolean(value: RuntimeValue, span: SourceSpan): boolean {
  if (value.kind !== "bool") fail(`Expected bool; received ${value.kind}.`, span);
  return value.value;
}

function checkedInteger(value: bigint, span: SourceSpan): IntValue {
  if (value < MIN_EXACT_INT || value > MAX_EXACT_INT) fail("Integer overflow.", span);
  return intValue(Number(value), span);
}

export function applyUnary(operator: UnaryOperator, operand: RuntimeValue, span: SourceSpan): PrimitiveValue {
  switch (operator) {
    case "not": return boolValue(!requireBoolean(operand, span));
    case "-": return intValue(-requireInt(operand, operator, span).value, span);
  }
}

function equality(left: RuntimeValue, right: RuntimeValue, span: SourceSpan): boolean {
  if ((left.kind !== "int" && left.kind !== "bool" && left.kind !== "string") ||
      (right.kind !== "int" && right.kind !== "bool" && right.kind !== "string") || left.kind !== right.kind) {
    fail(`Equality requires matching primitive types; received ${left.kind} and ${right.kind}.`, span);
  }
  return left.value === right.value;
}

/** Operands have already been evaluated left-to-right by the execution backend. */
export function applyBinary(
  operator: PrimitiveBinaryOperator, left: RuntimeValue, right: RuntimeValue, span: SourceSpan,
): IntValue | BoolValue {
  if (operator === "==") return boolValue(equality(left, right, span));
  if (operator === "!=") return boolValue(!equality(left, right, span));
  const a = requireInt(left, operator, span).value;
  const b = requireInt(right, operator, span).value;
  switch (operator) {
    case "<": return boolValue(a < b);
    case ">": return boolValue(a > b);
    case "<=": return boolValue(a <= b);
    case ">=": return boolValue(a >= b);
    case "+": return checkedInteger(BigInt(a) + BigInt(b), span);
    case "-": return checkedInteger(BigInt(a) - BigInt(b), span);
    case "*": return checkedInteger(BigInt(a) * BigInt(b), span);
    case "/": {
      if (b === 0) fail("Division by zero.", span);
      // BigInt division truncates toward zero without an intermediate rounded double.
      return checkedInteger(BigInt(a) / BigInt(b), span);
    }
  }
}

/** Returns text only; print owns output and adds its trailing newline later. */
export function formatPrimitive(value: RuntimeValue, span: SourceSpan): string {
  switch (value.kind) {
    case "int": return String(value.value);
    case "bool": return value.value ? "true" : "false";
    case "string": return value.value;
    case "void": fail("Cannot print a void value.", span);
    case "closure": return "<function>";
    case "list": return `[${value.elements.map((element) => formatPrimitive(element, span)).join(", ")}]`;
    case "reference": return "<reference>";
  }
}
