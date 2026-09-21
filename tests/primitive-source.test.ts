import { expect, test } from "bun:test";
import type { Expression } from "../src/ast/surface";
import { DiagnosticError } from "../src/diagnostics/diagnostic";
import { parse } from "../src/frontend/parser";
import { SourceFile } from "../src/frontend/source-file";
import { applyBinary } from "../src/runtime/primitive-operations";
import { boolValue, intValue, stringValue } from "../src/runtime/values";
import type { PrimitiveValue } from "../src/runtime/values";

// This is a literal conversion test adapter, not a Surface AST evaluator.
function literalValue(node: Expression): PrimitiveValue {
  switch (node.kind) {
    case "IntegerLiteral": return intValue(node.value, node.span);
    case "StringLiteral": return stringValue(node.value);
    case "BooleanLiteral": return boolValue(node.value);
    default: throw new Error("Expected a direct literal for this operation contract test.");
  }
}

for (const [source, expected] of [
  ["10 + 2", { kind: "int", value: 12 }],
  ["10 - 2", { kind: "int", value: 8 }],
  ["10 * 2", { kind: "int", value: 20 }],
  ["10 / 3", { kind: "int", value: 3 }],
  ["2 < 3", { kind: "bool", value: true }],
  ["2 > 3", { kind: "bool", value: false }],
  ["2 <= 2", { kind: "bool", value: true }],
  ["2 >= 3", { kind: "bool", value: false }],
  ['"same" == "same"', { kind: "bool", value: true }],
  ["true != false", { kind: "bool", value: true }],
] as const) {
  test(`parsed literal operands satisfy the primitive contract: ${source}`, () => {
    const parsed = parse(new SourceFile("primitive.nit", source));
    if (!parsed.ok) throw new Error(parsed.diagnostic.message);
    const statement = parsed.program.body[0];
    if (statement?.kind !== "ExpressionStatement" || statement.expression.kind !== "BinaryExpression") {
      throw new Error("Expected binary syntax.");
    }
    const node = statement.expression;
    if (node.operator === "and" || node.operator === "or") throw new Error("Logical sugar is not an eager primitive.");
    expect(applyBinary(node.operator, literalValue(node.left), literalValue(node.right), node.span)).toEqual(expected);
  });
}

test("parsed division failure preserves the source expression span", () => {
  const source = new SourceFile("zero.nit", "  10 / 0");
  const parsed = parse(source);
  if (!parsed.ok) throw new Error(parsed.diagnostic.message);
  const statement = parsed.program.body[0];
  if (statement?.kind !== "ExpressionStatement" || statement.expression.kind !== "BinaryExpression") throw new Error("Expected binary syntax.");
  const node = statement.expression;
  try {
    applyBinary("/", literalValue(node.left), literalValue(node.right), node.span);
    throw new Error("Expected division fault.");
  } catch (error: unknown) {
    if (!(error instanceof DiagnosticError)) throw error;
    expect(error.diagnostic.category).toBe("Runtime Error");
    expect(error.diagnostic.span).toEqual(source.span(2, 8));
  }
});

test("binding/block fixture preserves the structure needed for lexical locations", async () => {
  const file = new URL("./fixtures/valid/primitive-bindings.nit", import.meta.url);
  const result = parse(new SourceFile("primitive-bindings.nit", await Bun.file(file).text()));
  if (!result.ok) throw new Error(result.diagnostic.message);
  expect(result.program.body).toMatchObject([
    { kind: "LetDeclaration", name: { name: "count" }, annotation: { name: "int" }, initializer: { value: 10 } },
    { kind: "LetDeclaration", name: { name: "enabled" }, annotation: { name: "bool" } },
    { kind: "LetDeclaration", name: { name: "title" }, annotation: { name: "string" } },
    { kind: "BlockStatement", body: [
      { kind: "LetDeclaration", name: { name: "count" }, annotation: null, initializer: { kind: "BinaryExpression", left: { name: "count" }, right: { value: 2 } } },
      { kind: "LetDeclaration", name: { name: "enabled" }, initializer: { kind: "UnaryExpression", operator: "not", operand: { name: "enabled" } } },
      { kind: "BlockStatement", body: [{ kind: "LetDeclaration", name: { name: "title" }, initializer: { value: "inner" } }, { kind: "ExpressionStatement" }] },
      { kind: "ExpressionStatement" }, { kind: "ExpressionStatement" },
    ] },
    { kind: "ExpressionStatement" }, { kind: "ExpressionStatement" },
  ]);
  // Scope resolution and store mutation are intentionally not claimed by this test.
});
