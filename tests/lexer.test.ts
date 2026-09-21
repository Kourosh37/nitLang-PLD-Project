import { describe, expect, test } from "bun:test";
import { lex } from "../src/frontend/lexer";
import { SourceFile } from "../src/frontend/source-file";

function tokens(text: string) {
  const result = lex(new SourceFile("test.nit", text));
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result.tokens;
}

function diagnostic(text: string) {
  const result = lex(new SourceFile("invalid.nit", text));
  if (result.ok) throw new Error("Expected lexical failure.");
  expect("tokens" in result).toBe(false);
  expect(result.diagnostic.category).toBe("Syntax Error");
  return result.diagnostic;
}

describe("token vocabulary", () => {
  test("all specified keywords and complete identifiers", () => {
    const words = "let func return lambda if then else while do for in range and or not ref class extends this new try catch throw match int bool string void true false".split(" ");
    expect(tokens(words.join(" ")).map<string>((token) => token.kind)).toEqual([...words, "eof"]);
    for (const name of ["letx", "Let", "TRUE", "_", "_x9", "print", "map", "List", "Ref", "Fn", "constructor", "toString", "__proto__"]) {
      expect(tokens(name).map((token) => token.kind)).toEqual(["identifier", "eof"]);
    }
  });

  test("every punctuation token", () => {
    const symbols = "+ - * / == != < > <= >= = := -> => ( ) { } [ ] , : ; .".split(" ");
    expect(tokens(symbols.join(" ")).map<string>((token) => token.kind)).toEqual([...symbols, "eof"]);
  });

  test("longest match without whitespace", () => {
    expect(tokens("a:=b==c!=d<=e>=f->g=>h").map((token) => token.kind)).toEqual([
      "identifier", ":=", "identifier", "==", "identifier", "!=", "identifier", "<=",
      "identifier", ">=", "identifier", "->", "identifier", "=>", "identifier", "eof",
    ]);
    expect(tokens("=== ---> ::=").map((token) => token.kind)).toEqual(["==", "=", "-", "-", "->", ":", ":=", "eof"]);
  });

  test("integer values, bounds, leading zeros and separate unary sign", () => {
    const result = tokens("0 007 9007199254740991 -42");
    expect(result.filter((token) => token.kind === "integer").map((token) => token.value)).toEqual([0, 7, 9007199254740991, 42]);
    expect(result.map((token) => token.lexeme)).toEqual(["0", "007", "9007199254740991", "-", "42", ""]);
    expect(tokens("0".repeat(500) + "1")[0]).toMatchObject({ kind: "integer", value: 1 });
  });

  test("lexing does not parse expressions or check types", () => {
    expect(tokens('1.5 "hello" - true )').map((token) => token.kind)).toEqual([
      "integer", ".", "integer", "string-literal", "-", "true", ")", "eof",
    ]);
  });
});

describe("strings and trivia", () => {
  test("decodes only supported escapes and preserves original lexeme", () => {
    const raw = String.raw`"quote:\" slash:\\ newline:\n return:\r tab:\t"`;
    expect(tokens(raw)[0]).toMatchObject({
      kind: "string-literal", lexeme: raw, value: 'quote:" slash:\\ newline:\n return:\r tab:\t',
    });
    expect(tokens('""')[0]).toMatchObject({ kind: "string-literal", value: "" });
  });

  test("Unicode and comment markers inside strings remain content", () => {
    const value = "\u0633\u0644\u0627\u0645 \u{1F600} // /* */ \uFEFF";
    expect(tokens(`"${value}"`)[0]).toMatchObject({ kind: "string-literal", value });
  });

  test("comments separate tokens and block comments do not nest", () => {
    expect(tokens("left/**/right / 2 // ignored\r\n+3 /* outer /* inner */ +4").map((token) => token.lexeme)).toEqual([
      "left", "right", "/", "2", "+", "3", "+", "4", "",
    ]);
  });

  for (const text of ["", " \t\r\n", "// eof", "/* closed */", "\uFEFF", "\uFEFF // comment\n"]) {
    test(`trivia-only input ${JSON.stringify(text)}`, () => {
      const result = tokens(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: "eof", lexeme: "", span: { start: { offset: text.length }, end: { offset: text.length } } });
    });
  }

  test("comments ignore quotes, escapes and otherwise invalid characters", () => {
    expect(tokens('/* " \\ @ ! */ // " @\r42')[0]).toMatchObject({ kind: "integer", value: 42 });
  });
});

describe("spans and state isolation", () => {
  test("BOM, comments, CRLF, CR and LF retain original positions", () => {
    const result = tokens("\uFEFFlet x=1\r\n/*c*/\tprint(x)\rtrue\n");
    expect(result[0]?.span).toEqual({ sourceName: "test.nit", start: { offset: 1, line: 1, column: 2 }, end: { offset: 4, line: 1, column: 5 } });
    expect(result.find((token) => token.lexeme === "print")?.span).toEqual({ sourceName: "test.nit", start: { offset: 16, line: 2, column: 7 }, end: { offset: 21, line: 2, column: 12 } });
    expect(result.at(-1)?.span.start).toEqual({ offset: 30, line: 4, column: 1 });
  });

  test("tokens preserve slices and monotonically increasing nonempty spans", () => {
    const source = 'let label = "\u0633\u{1F600}"\n /* gap */ label == "x"';
    let previousEnd = 0;
    for (const token of tokens(source)) {
      expect(token.lexeme).toBe(source.slice(token.span.start.offset, token.span.end.offset));
      expect(token.span.start.offset).toBeGreaterThanOrEqual(previousEnd);
      expect(token.span.end.offset - token.span.start.offset).toBe(token.lexeme.length);
      if (token.kind !== "eof") expect(token.lexeme.length).toBeGreaterThan(0);
      previousEnd = token.span.end.offset;
    }
  });

  test("repeated lexing has no stale cursor and tokens are immutable", () => {
    const source = new SourceFile("repeat.nit", "let x = 1");
    const first = lex(source);
    diagnostic("@");
    expect(lex(source)).toEqual(first);
    if (!first.ok) throw new Error("Expected success.");
    expect(Object.isFrozen(first.tokens)).toBe(true);
    for (const token of first.tokens) expect(Object.isFrozen(token)).toBe(true);
  });
});

describe("controlled lexical diagnostics", () => {
  for (const text of ["9007199254740992", "999999999999999999999", "9".repeat(400)]) {
    test(`overflow with ${text.length} digits`, () => {
      const error = diagnostic(text);
      expect(error.message).toContain("safe integer limit");
      expect(error.span.start.offset).toBe(0);
      expect(error.span.end.offset).toBe(text.length);
    });
  }

  for (const text of ["12abc", "0xFF", "1_000", "1e3"]) {
    test(`malformed numeric literal ${text}`, () => {
      const error = diagnostic(text);
      expect(error.message).toContain("Malformed integer");
      expect(error.span.end.offset).toBe(text.length);
    });
  }

  for (const character of ["!", "@", "&", "|", "%", "?", "\u00A0", "\v", "\f", "\u0633", "\u{1F600}", "\uD800"]) {
    test(`unknown character ${JSON.stringify(character)}`, () => {
      const error = diagnostic(`let x=1\n${character}`);
      expect(error.message).toContain("Unexpected character");
      expect(error.span.start).toEqual({ offset: 8, line: 2, column: 1 });
      expect(error.span.end.offset).toBe(8 + character.length);
    });
  }

  test("BOM is accepted only at the start", () => {
    expect(diagnostic(" \uFEFF").span.start.offset).toBe(1);
    expect(diagnostic("\uFEFF\uFEFF").span.start.offset).toBe(1);
  });

  for (const text of ['"missing', '"', '/*', '/* missing', '/**']) {
    test(`unterminated input ${JSON.stringify(text)}`, () => {
      const error = diagnostic(text);
      expect(error.message).toContain("Unterminated");
      expect(error.span.start.offset).toBe(0);
      expect(error.span.end.offset).toBe(text.length);
    });
  }

  for (const newline of ["\n", "\r", "\r\n"]) {
    test(`raw newline ${JSON.stringify(newline)} rejected inside string`, () => {
      expect(diagnostic(`"abc${newline}def"`).message).toContain("Raw newline");
    });
  }

  for (const escape of ["q", "0", "u", "x", "\n", "\r"]) {
    test(`unsupported escape ${JSON.stringify(escape)}`, () => {
      const error = diagnostic(`"a\\${escape}"`);
      expect(error.message).toContain("Unsupported string escape");
      expect(error.span.start.offset).toBe(2);
      expect(error.span.end.offset).toBe(4);
    });
  }

  test("trailing backslash gets an escape diagnostic", () => {
    const error = diagnostic('"a\\');
    expect(error.message).toBe("Unterminated string escape.");
    expect(error.span.start.offset).toBe(2);
    expect(error.span.end.offset).toBe(3);
  });

  test("returns the first failure without partial tokens", () => {
    const error = diagnostic("let x = 1; @ !");
    expect(error.span.start.offset).toBe(11);
    expect(error.message).toContain('"@"');
  });
});
