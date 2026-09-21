import type { SourceSpan } from "./source-span";

export const keywords = [
  "let",
  "func",
  "return",
  "lambda",
  "if",
  "then",
  "else",
  "while",
  "do",
  "for",
  "in",
  "range",
  "and",
  "or",
  "not",
  "ref",
  "class",
  "extends",
  "this",
  "new",
  "try",
  "catch",
  "throw",
  "match",
  "int",
  "bool",
  "string",
  "void",
  "true",
  "false",
] as const;

export const punctuation = [
  "+",
  "-",
  "*",
  "/",
  "==",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "=",
  ":=",
  "->",
  "=>",
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  ",",
  ":",
  ";",
  ".",
] as const;

export type KeywordKind = (typeof keywords)[number];
export type PunctuationKind = (typeof punctuation)[number];
export type TokenKind =
  KeywordKind | PunctuationKind | "identifier" | "integer" | "string-literal" | "eof";

interface TokenBase {
  readonly lexeme: string;
  readonly span: SourceSpan;
}

export type Token =
  | (TokenBase & { readonly kind: "integer"; readonly value: number })
  | (TokenBase & { readonly kind: "string-literal"; readonly value: string })
  | (TokenBase & { readonly kind: Exclude<TokenKind, "integer" | "string-literal"> });
