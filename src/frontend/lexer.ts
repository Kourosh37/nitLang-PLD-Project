import { DiagnosticError } from "../diagnostics/diagnostic";
import type { Diagnostic } from "../diagnostics/diagnostic";
import { SourceFile } from "./source-file";
import { keywords, punctuation } from "./token";
import type { KeywordKind, PunctuationKind, Token } from "./token";

export type LexResult =
  | { readonly ok: true; readonly tokens: readonly Token[] }
  | { readonly ok: false; readonly diagnostic: Diagnostic };

const keywordKinds: ReadonlyMap<string, KeywordKind> = new Map(
  keywords.map((kind) => [kind, kind]),
);
const punctuationKinds: ReadonlyMap<string, PunctuationKind> = new Map(
  punctuation.map((kind) => [kind, kind]),
);
const escapes: ReadonlyMap<string, string> = new Map([
  ['"', '"'],
  ["\\", "\\"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
]);

function isDigit(character: string): boolean {
  return character >= "0" && character <= "9";
}

function isIdentifierStart(character: string): boolean {
  return (
    character === "_" ||
    (character >= "a" && character <= "z") ||
    (character >= "A" && character <= "Z")
  );
}

function isIdentifierPart(character: string): boolean {
  return isIdentifierStart(character) || isDigit(character);
}

class Lexer {
  private offset = 0;
  private readonly tokens: Token[] = [];

  constructor(private readonly source: SourceFile) {}

  scan(): readonly Token[] {
    if (this.peek() === "\uFEFF") this.offset += 1;
    while (this.offset < this.source.text.length) {
      if (this.skipTrivia()) continue;
      const start = this.offset;
      const character = this.peek();
      if (isIdentifierStart(character)) this.identifier(start);
      else if (isDigit(character)) this.integer(start);
      else if (character === '"') this.string(start);
      else this.symbol(start);
    }
    this.tokens.push(
      Object.freeze({ kind: "eof", lexeme: "", span: this.source.span(this.offset) }),
    );
    return Object.freeze(this.tokens);
  }

  private peek(ahead = 0): string {
    return this.source.text[this.offset + ahead] ?? "";
  }

  private skipTrivia(): boolean {
    const character = this.peek();
    if (character === " " || character === "\t" || character === "\r" || character === "\n") {
      this.offset += 1;
      return true;
    }
    if (character !== "/") return false;
    if (this.peek(1) === "/") {
      this.offset += 2;
      while (this.peek() !== "" && this.peek() !== "\r" && this.peek() !== "\n") this.offset += 1;
      return true;
    }
    if (this.peek(1) !== "*") return false;
    const start = this.offset;
    this.offset += 2;
    while (this.peek() !== "") {
      if (this.peek() === "*" && this.peek(1) === "/") {
        this.offset += 2;
        return true;
      }
      this.offset += 1;
    }
    this.fail("Unterminated block comment.", start);
  }

  private identifier(start: number): void {
    while (isIdentifierPart(this.peek())) this.offset += 1;
    const lexeme = this.source.text.slice(start, this.offset);
    this.tokens.push(
      Object.freeze({
        kind: keywordKinds.get(lexeme) ?? "identifier",
        lexeme,
        span: this.source.span(start, this.offset),
      }),
    );
  }

  private integer(start: number): void {
    while (isDigit(this.peek())) this.offset += 1;
    if (isIdentifierStart(this.peek())) {
      while (isIdentifierPart(this.peek())) this.offset += 1;
      this.fail(
        "Malformed integer literal: digits cannot be followed by identifier characters.",
        start,
      );
    }
    const lexeme = this.source.text.slice(start, this.offset);
    const value = Number(lexeme);
    if (!Number.isSafeInteger(value))
      this.fail("Integer literal exceeds the safe integer limit (9007199254740991).", start);
    this.tokens.push(
      Object.freeze({ kind: "integer", lexeme, value, span: this.source.span(start, this.offset) }),
    );
  }

  private string(start: number): void {
    this.offset += 1;
    const decoded: string[] = [];
    while (this.peek() !== "") {
      const character = this.peek();
      if (character === '"') {
        this.offset += 1;
        this.tokens.push(
          Object.freeze({
            kind: "string-literal",
            lexeme: this.source.text.slice(start, this.offset),
            value: decoded.join(""),
            span: this.source.span(start, this.offset),
          }),
        );
        return;
      }
      if (character === "\r" || character === "\n")
        this.fail("Raw newline in string literal.", start);
      if (character !== "\\") {
        decoded.push(character);
        this.offset += 1;
        continue;
      }
      const escapeStart = this.offset;
      this.offset += 1;
      if (this.peek() === "") this.fail("Unterminated string escape.", escapeStart);
      const escaped = this.peek();
      this.offset += 1;
      const value = escapes.get(escaped);
      if (value === undefined)
        this.fail(`Unsupported string escape ${JSON.stringify("\\" + escaped)}.`, escapeStart);
      decoded.push(value);
    }
    this.fail("Unterminated string literal.", start);
  }

  private symbol(start: number): void {
    const pair = this.source.text.slice(this.offset, this.offset + 2);
    const kind = punctuationKinds.get(pair) ?? punctuationKinds.get(this.peek());
    if (kind === undefined) {
      const point = this.source.text.codePointAt(this.offset);
      this.offset += point !== undefined && point > 0xffff ? 2 : 1;
      this.fail(
        `Unexpected character ${JSON.stringify(this.source.text.slice(start, this.offset))}.`,
        start,
      );
    }
    this.offset += kind.length;
    this.tokens.push(
      Object.freeze({ kind, lexeme: kind, span: this.source.span(start, this.offset) }),
    );
  }

  private fail(message: string, start: number): never {
    throw new DiagnosticError(
      Object.freeze({
        category: "Syntax Error",
        message,
        span: this.source.span(start, this.offset),
      }),
    );
  }
}

/** Stops at the first lexical error; never returns a partial token stream. */
export function lex(source: SourceFile): LexResult {
  try {
    return { ok: true, tokens: new Lexer(source).scan() };
  } catch (error: unknown) {
    if (error instanceof DiagnosticError) return { ok: false, diagnostic: error.diagnostic };
    throw error;
  }
}
