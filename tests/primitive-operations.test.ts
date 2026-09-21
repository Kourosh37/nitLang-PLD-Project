import { describe, expect, test } from "bun:test";
import { DiagnosticError } from "../src/diagnostics/diagnostic";
import type { PrimitiveBinaryOperator } from "../src/language/operators";
import { SourceFile } from "../src/frontend/source-file";
import { applyBinary, applyUnary, formatPrimitive, requireBoolean } from "../src/runtime/primitive-operations";
import { boolValue, intValue, MAX_INT, MIN_INT, stringValue, VOID } from "../src/runtime/values";
import type { RuntimeValue } from "../src/runtime/values";

const span = new SourceFile("operations.nit", "1 / 0").span(0, 5);
const int = (value: number) => intValue(value, span);

function runtimeFailure(action: () => unknown, message: string): void {
  let caught: unknown;
  try { action(); } catch (error: unknown) { caught = error; }
  expect(caught).toBeInstanceOf(DiagnosticError);
  if (!(caught instanceof DiagnosticError)) throw new Error("Expected controlled diagnostic.");
  expect(caught.diagnostic.category).toBe("Runtime Error");
  expect(caught.diagnostic.message).toContain(message);
  expect(caught.diagnostic.span).toBe(span);
}

describe("tagged primitive values", () => {
  test("factories preserve kinds and freeze values", () => {
    const values = [int(12), boolValue(true), stringValue("text"), VOID];
    expect(values).toEqual([
      { kind: "int", value: 12 }, { kind: "bool", value: true },
      { kind: "string", value: "text" }, { kind: "void" },
    ]);
    for (const value of values) expect(Object.isFrozen(value)).toBe(true);
    expect(Reflect.set(values[0] ?? {}, "value", 99)).toBe(false);
    expect(values[0]).toEqual({ kind: "int", value: 12 });
  });

  test("safe integer endpoints are inclusive and negative zero is normalized", () => {
    expect(int(MAX_INT).value).toBe(9007199254740991);
    expect(int(MIN_INT).value).toBe(-9007199254740991);
    expect(Object.is(int(-0).value, -0)).toBe(false);
    expect(int(-0).value).toBe(0);
  });

  for (const number of [NaN, Infinity, -Infinity, 1.5, MAX_INT + 1, MIN_INT - 1]) {
    test(`rejects invalid int payload ${number}`, () => {
      runtimeFailure(() => int(number), "safe integer range");
    });
  }
});

describe("integer arithmetic", () => {
  const cases: readonly (readonly [PrimitiveBinaryOperator, number, number, number])[] = [
    ["+", 7, 5, 12], ["+", -7, 5, -2], ["-", 7, 5, 2], ["-", -7, -5, -2],
    ["*", -7, 5, -35], ["*", -7, -5, 35], ["*", 0, MAX_INT, 0],
    ["/", 7, 3, 2], ["/", -7, 3, -2], ["/", 7, -3, -2], ["/", -7, -3, 2],
    ["/", 1, -2, 0], ["/", 0, -3, 0], ["/", MAX_INT, 3, 3002399751580330],
    ["/", MIN_INT, -1, MAX_INT], ["+", MAX_INT, MIN_INT, 0],
    ["-", MAX_INT, 1, 9007199254740990], ["*", MAX_INT, 1, MAX_INT],
    ["*", MIN_INT, -1, MAX_INT], ["/", MIN_INT, MAX_INT, -1],
  ];
  for (const [operator, left, right, expected] of cases) {
    test(`${left} ${operator} ${right} produces ${expected}`, () => {
      expect(applyBinary(operator, int(left), int(right), span)).toEqual(int(expected));
    });
  }

  for (const [operator, left, right] of [
    ["+", MAX_INT, 1], ["+", MIN_INT, -1], ["-", MIN_INT, 1], ["-", MAX_INT, -1],
    ["*", MAX_INT, 2], ["*", MIN_INT, 2], ["*", 94906266, 94906266],
  ] as const) {
    test(`overflow for ${left} ${operator} ${right}`, () => {
      runtimeFailure(() => applyBinary(operator, int(left), int(right), span), "overflow");
    });
  }

  test("division by zero is controlled even for zero numerator", () => {
    for (const left of [0, 1, -1, MAX_INT]) {
      runtimeFailure(() => applyBinary("/", int(left), int(0), span), "Division by zero");
    }
  });

  test("unary negation handles both endpoints and canonical zero", () => {
    expect(applyUnary("-", int(MAX_INT), span)).toEqual(int(MIN_INT));
    expect(applyUnary("-", int(MIN_INT), span)).toEqual(int(MAX_INT));
    const zero = applyUnary("-", int(0), span);
    expect(zero).toEqual(int(0));
    expect(zero.kind === "int" && Object.is(zero.value, -0)).toBe(false);
  });
});

describe("comparisons and boolean values", () => {
  for (const [operator, less, equal, greater] of [
    ["<", true, false, false], [">", false, false, true],
    ["<=", true, true, false], [">=", false, true, true],
    ["==", false, true, false], ["!=", true, false, true],
  ] as const) {
    test(`comparison ${operator}`, () => {
      expect(applyBinary(operator, int(MIN_INT), int(MAX_INT), span)).toEqual(boolValue(less));
      expect(applyBinary(operator, int(2), int(2), span)).toEqual(boolValue(equal));
      expect(applyBinary(operator, int(MAX_INT), int(MIN_INT), span)).toEqual(boolValue(greater));
    });
  }

  test("string and bool equality use values and preserve Unicode identity", () => {
    for (const [left, right, equal] of [
      [stringValue("same"), stringValue("same"), true],
      [stringValue("Same"), stringValue("same"), false],
      [stringValue("\u00E9"), stringValue("e\u0301"), false],
      [boolValue(true), boolValue(false), false],
      [boolValue(false), boolValue(false), true],
    ] as const) {
      expect(applyBinary("==", left, right, span)).toEqual(boolValue(equal));
      expect(applyBinary("!=", left, right, span)).toEqual(boolValue(!equal));
    }
  });

  test("not and conditions require actual bool values", () => {
    expect(requireBoolean(boolValue(true), span)).toBe(true);
    expect(requireBoolean(boolValue(false), span)).toBe(false);
    expect(applyUnary("not", boolValue(true), span)).toEqual(boolValue(false));
    expect(applyUnary("not", boolValue(false), span)).toEqual(boolValue(true));
    for (const value of [int(0), int(1), stringValue(""), stringValue("false"), VOID]) {
      runtimeFailure(() => requireBoolean(value, span), "Expected bool");
      runtimeFailure(() => applyUnary("not", value, span), "Expected bool");
    }
  });
});

describe("no implicit coercion", () => {
  const values: readonly RuntimeValue[] = [int(1), boolValue(true), stringValue("1"), VOID];
  for (const operator of ["+", "-", "*", "/", "<", ">", "<=", ">="] as const) {
    test(`${operator} rejects every non-int operand pairing`, () => {
      for (const left of values) for (const right of values) {
        if (left.kind === "int" && right.kind === "int") continue;
        runtimeFailure(() => applyBinary(operator, left, right, span), "requires int");
      }
    });
  }

  for (const operator of ["==", "!="] as const) {
    test(`${operator} rejects mismatched types and void`, () => {
      for (const left of values) for (const right of values) {
        if (left.kind === right.kind && left.kind !== "void") continue;
        runtimeFailure(() => applyBinary(operator, left, right, span), "matching primitive types");
      }
    });
  }

  test("negation rejects bool, string and void", () => {
    for (const value of [boolValue(true), stringValue("1"), VOID]) {
      runtimeFailure(() => applyUnary("-", value, span), "requires int");
    }
  });
});

describe("primitive output formatting", () => {
  test("formats values without host object syntax, quotes or extra newlines", () => {
    expect(formatPrimitive(int(MAX_INT), span)).toBe("9007199254740991");
    expect(formatPrimitive(int(MIN_INT), span)).toBe("-9007199254740991");
    expect(formatPrimitive(int(-0), span)).toBe("0");
    expect(formatPrimitive(boolValue(true), span)).toBe("true");
    expect(formatPrimitive(boolValue(false), span)).toBe("false");
    expect(formatPrimitive(stringValue("\u0633\u0644\u0627\u0645\n"), span)).toBe("\u0633\u0644\u0627\u0645\n");
    expect(formatPrimitive(stringValue(""), span)).toBe("");
  });

  test("void is internal and cannot be printed", () => {
    runtimeFailure(() => formatPrimitive(VOID, span), "Cannot print a void value");
  });
});
