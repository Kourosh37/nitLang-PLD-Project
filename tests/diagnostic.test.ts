import { expect, test } from "bun:test";
import { DiagnosticError, formatDiagnostic } from "../src/diagnostics/diagnostic";
import { lex } from "../src/frontend/lexer";
import { SourceFile } from "../src/frontend/source-file";

test("lexical failure renders category and source location without a host trace", () => {
  const result = lex(new SourceFile("bad.nit", "let x = 1\n@"));
  if (result.ok) throw new Error("Expected failure.");
  expect(formatDiagnostic(result.diagnostic)).toBe(
    'bad.nit:2:1: Syntax Error: Unexpected character "@".',
  );
});

test("diagnostic notes and controlled internal error preserve structured data", () => {
  const diagnostic = {
    category: "Type Error" as const,
    message: "Expected int.",
    span: new SourceFile("types.nit", "x").span(0, 1),
    notes: ["The binding was declared here.", "Use an integer value."],
  };
  const error = new DiagnosticError(diagnostic);
  expect(error.diagnostic).toBe(diagnostic);
  expect(error.name).toBe("DiagnosticError");
  expect(error.message).toBe("Expected int.");
  expect(formatDiagnostic(diagnostic)).toBe(
    "types.nit:1:1: Type Error: Expected int.\n  note: The binding was declared here.\n  note: Use an integer value.",
  );
});
test("renderer includes the original line and a bounded caret", () => {
  const source = new SourceFile("bad.nit", "let x = 1\r\nprint(missing)\r\n");
  const diagnostic = {
    category: "Type Error" as const,
    message: "Undefined.",
    span: source.span(17, 24),
  };
  expect(formatDiagnostic(diagnostic, source)).toBe(
    "bad.nit:2:7: Type Error: Undefined.\n  print(missing)\n        ^^^^^^^",
  );
});
