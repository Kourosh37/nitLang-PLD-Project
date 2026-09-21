import type {
  BlockStatement, ClassDeclaration, Expression, FieldDeclaration, FunctionDeclaration,
  Identifier, Parameter, Program, Statement, TopLevelItem, TypeAnnotation,
} from "../ast/surface";
import { DiagnosticError } from "../diagnostics/diagnostic";
import type { Diagnostic } from "../diagnostics/diagnostic";
import { lex } from "./lexer";
import { binaryPrecedence, isBinaryOperator } from "./precedence";
import { SourceFile } from "./source-file";
import type { SourceSpan } from "./source-span";
import type { Token, TokenKind } from "./token";

export type ParseResult =
  | { readonly ok: true; readonly program: Program }
  | { readonly ok: false; readonly diagnostic: Diagnostic };

/** Bound syntactic recursion before it can overflow the host stack. */
export const MAX_PARSE_DEPTH = 128;

class Parser {
  private cursor = 0;
  private depth = 0;

  constructor(private readonly source: SourceFile, private readonly tokens: readonly Token[]) {}

  program(): Program {
    const body: TopLevelItem[] = [];
    while (!this.at("eof")) body.push(this.at("class") ? this.classDeclaration() : this.statement());
    return { kind: "Program", body, span: this.source.span(0, this.source.text.length) };
  }

  private current(): Token {
    const token = this.tokens[this.cursor];
    if (token === undefined) throw new Error("Parser token stream is missing EOF.");
    return token;
  }

  private at(kind: TokenKind): boolean { return this.current().kind === kind; }

  private advance(): Token {
    const token = this.current();
    if (token.kind !== "eof") this.cursor += 1;
    return token;
  }

  private take(kind: TokenKind): boolean {
    if (!this.at(kind)) return false;
    this.advance();
    return true;
  }

  private expect(kind: TokenKind): Token {
    if (!this.at(kind)) this.fail(`Expected '${kind}', found ${this.describeCurrent()}.`);
    return this.advance();
  }

  private describeCurrent(): string {
    return this.at("eof") ? "end of file" : JSON.stringify(this.current().lexeme);
  }

  private fail(message: string, span = this.current().span): never {
    throw new DiagnosticError({ category: "Syntax Error", message, span });
  }

  private nested<T>(parse: () => T): T {
    if (this.depth >= MAX_PARSE_DEPTH) this.fail(`Syntax nesting exceeds the parser limit (${MAX_PARSE_DEPTH}).`);
    this.depth += 1;
    try { return parse(); } finally { this.depth -= 1; }
  }

  private spanFrom(start: number): SourceSpan {
    const previous = this.tokens[this.cursor - 1];
    return this.source.span(start, previous?.span.end.offset ?? start);
  }

  private identifier(): Identifier {
    const token = this.expect("identifier");
    return { kind: "Identifier", name: token.lexeme, span: token.span };
  }

  private separated<T>(end: TokenKind, item: () => T): T[] {
    const items: T[] = [];
    if (!this.at(end)) {
      do { items.push(item()); } while (this.take(","));
    }
    this.expect(end);
    return items;
  }

  private parameters(): Parameter[] {
    this.expect("(");
    return this.separated(")", () => {
      const name = this.identifier();
      this.expect(":");
      const annotation = this.typeAnnotation();
      return { kind: "Parameter", name, annotation, span: this.spanFrom(name.span.start.offset) };
    });
  }

  private typeAnnotation(): TypeAnnotation {
    return this.nested(() => {
      const token = this.advance();
      const start = token.span.start.offset;
      if (token.kind === "int" || token.kind === "bool" || token.kind === "string" || token.kind === "void") {
        return { kind: "PrimitiveType", name: token.kind, span: token.span };
      }
      if (token.kind !== "identifier") this.fail("Expected a type annotation.", token.span);
      if (token.lexeme === "List" || token.lexeme === "Ref") {
        this.expect("<");
        const element = this.typeAnnotation();
        this.expect(">");
        return { kind: token.lexeme === "List" ? "ListType" : "ReferenceType", element, span: this.spanFrom(start) };
      }
      if (token.lexeme === "Fn") {
        this.expect("(");
        const parameters = this.separated(")", () => this.typeAnnotation());
        this.expect("->");
        const result = this.typeAnnotation();
        return { kind: "FunctionType", parameters, result, span: this.spanFrom(start) };
      }
      return { kind: "NamedType", name: token.lexeme, span: token.span };
    });
  }

  private block(): BlockStatement {
    const start = this.expect("{").span.start.offset;
    const body: Statement[] = [];
    while (!this.at("}") && !this.at("eof")) body.push(this.statement());
    this.expect("}");
    return { kind: "BlockStatement", body, span: this.spanFrom(start) };
  }

  private statement(): Statement {
    return this.nested(() => this.statementBody());
  }

  private statementBody(): Statement {
    const start = this.current().span.start.offset;
    switch (this.current().kind) {
      case ";": this.advance(); return { kind: "EmptyStatement", span: this.spanFrom(start) };
      case "{": return this.block();
      case "let": {
        this.advance();
        const name = this.identifier();
        const annotation = this.take(":") ? this.typeAnnotation() : null;
        this.expect("=");
        const initializer = this.expression();
        this.take(";");
        return { kind: "LetDeclaration", name, annotation, initializer, span: this.spanFrom(start) };
      }
      case "func": return this.functionDeclaration();
      case "if": {
        this.advance();
        const condition = this.expression();
        this.expect("then");
        const thenBranch = this.block();
        const elseBranch = this.take("else") ? this.block() : null;
        this.take(";");
        return { kind: "IfStatement", condition, thenBranch, elseBranch, span: this.spanFrom(start) };
      }
      case "while": {
        this.advance();
        const condition = this.expression();
        this.expect("do");
        const body = this.block();
        this.take(";");
        return { kind: "WhileStatement", condition, body, span: this.spanFrom(start) };
      }
      case "for": return this.forStatement();
      case "return": {
        this.advance();
        const value = this.at(";") ? null : this.expression();
        this.take(";");
        return { kind: "ReturnStatement", value, span: this.spanFrom(start) };
      }
      case "throw": {
        this.advance();
        const value = this.expression();
        this.take(";");
        return { kind: "ThrowStatement", value, span: this.spanFrom(start) };
      }
      case "try": {
        this.advance();
        const body = this.block();
        this.expect("catch");
        const catchName = this.identifier();
        const catchBody = this.block();
        this.take(";");
        return { kind: "TryStatement", body, catchName, catchBody, span: this.spanFrom(start) };
      }
      case "class": this.fail("Class declarations are only allowed at top level.");
      default: return this.expressionStatement();
    }
  }

  private functionDeclaration(): FunctionDeclaration {
    const start = this.expect("func").span.start.offset;
    const name = this.identifier();
    const parameters = this.parameters();
    const returnType = this.take(":") ? this.typeAnnotation() : null;
    this.expect("=");
    const body = this.block();
    this.take(";");
    return { kind: "FunctionDeclaration", name, parameters, returnType, body, span: this.spanFrom(start) };
  }

  private forStatement(): Statement {
    const start = this.expect("for").span.start.offset;
    const variable = this.identifier();
    this.expect("in");
    this.expect("range");
    this.expect("(");
    const from = this.expression();
    this.expect(",");
    const end = this.expression();
    this.expect(")");
    const body = this.block();
    this.take(";");
    return { kind: "ForStatement", variable, start: from, end, body, span: this.spanFrom(start) };
  }

  private classDeclaration(): ClassDeclaration {
    const start = this.expect("class").span.start.offset;
    const name = this.identifier();
    const parent = this.take("extends") ? this.identifier() : null;
    this.expect("{");
    const members: (FieldDeclaration | FunctionDeclaration)[] = [];
    while (!this.at("}") && !this.at("eof")) {
      if (this.at("func")) members.push(this.functionDeclaration());
      else if (this.at("let")) {
        const fieldStart = this.advance().span.start.offset;
        const fieldName = this.identifier();
        this.expect(":");
        const annotation = this.typeAnnotation();
        this.take(";");
        members.push({ kind: "FieldDeclaration", name: fieldName, annotation, span: this.spanFrom(fieldStart) });
      } else this.fail("Expected a field or method declaration.");
    }
    this.expect("}");
    this.take(";");
    return { kind: "ClassDeclaration", name, parent, members, span: this.spanFrom(start) };
  }

  private expressionStatement(): Statement {
    const start = this.current().span.start.offset;
    const expression = this.expression();
    if (this.take("=")) {
      let target = expression;
      while (target.kind === "GroupExpression") target = target.expression;
      if (target.kind !== "Identifier" && target.kind !== "MemberExpression") {
        this.fail("Assignment target must be an identifier or field.", expression.span);
      }
      const value = this.expression();
      this.take(";");
      return { kind: "AssignmentStatement", target, value, span: this.spanFrom(start) };
    }
    if (this.take(":=")) {
      const value = this.expression();
      this.take(";");
      return { kind: "ReferenceAssignmentStatement", target: expression, value, span: this.spanFrom(start) };
    }
    this.take(";");
    return { kind: "ExpressionStatement", expression, span: this.spanFrom(start) };
  }

  private expression(minimum = 1): Expression {
    return this.nested(() => {
      let left = this.unary();
      while (true) {
        const operator = this.current().kind;
        if (!isBinaryOperator(operator) || binaryPrecedence[operator] < minimum) break;
        this.advance();
        const right = this.expression(binaryPrecedence[operator] + 1);
        left = { kind: "BinaryExpression", operator, left, right, span: this.spanFrom(left.span.start.offset) };
      }
      return left;
    });
  }

  private unary(): Expression {
    const token = this.current();
    if (token.kind === "-" || token.kind === "not") {
      this.advance();
      const operand = this.nested(() => this.unary());
      return { kind: "UnaryExpression", operator: token.kind, operand, span: this.spanFrom(token.span.start.offset) };
    }
    if (this.take("ref")) {
      const target = this.identifier();
      return { kind: "ReferenceExpression", target, span: this.spanFrom(token.span.start.offset) };
    }
    let expression = this.primary();
    while (this.at("(") || this.at(".")) {
      const start = expression.span.start.offset;
      if (this.take(".")) {
        const member = this.identifier();
        expression = { kind: "MemberExpression", object: expression, member, span: this.spanFrom(start) };
      } else {
        const args = this.arguments();
        expression = { kind: "CallExpression", callee: expression, arguments: args, span: this.spanFrom(start) };
      }
    }
    return expression;
  }

  private arguments(): Expression[] {
    this.expect("(");
    return this.separated(")", () => this.expression());
  }

  private primary(): Expression {
    const token = this.current();
    const start = token.span.start.offset;
    switch (token.kind) {
      case "integer": this.advance(); return { kind: "IntegerLiteral", value: token.value, span: token.span };
      case "string-literal": this.advance(); return { kind: "StringLiteral", value: token.value, span: token.span };
      case "true": case "false": this.advance(); return { kind: "BooleanLiteral", value: token.kind === "true", span: token.span };
      case "identifier": return this.identifier();
      case "this": this.advance(); return { kind: "ThisExpression", span: token.span };
      case "(": {
        this.advance();
        const expression = this.expression();
        this.expect(")");
        return { kind: "GroupExpression", expression, span: this.spanFrom(start) };
      }
      case "[": {
        this.advance();
        const elements = this.separated("]", () => this.expression());
        return { kind: "ListExpression", elements, span: this.spanFrom(start) };
      }
      case "lambda": {
        this.advance();
        const parameters = this.parameters();
        this.expect("->");
        const body = this.expression();
        return { kind: "LambdaExpression", parameters, body, span: this.spanFrom(start) };
      }
      case "new": {
        this.advance();
        const className = this.identifier();
        const args = this.arguments();
        return { kind: "NewExpression", className, arguments: args, span: this.spanFrom(start) };
      }
      case "match": {
        this.advance();
        const scrutinee = this.expression();
        this.expect("{");
        const arms: import("../ast/surface").MatchArm[] = [];
        while (!this.at("}") && !this.at("eof")) {
          const patternStart = this.current().span.start.offset;
          let negative = false; if (this.take("-")) negative = true;
          const patternToken = this.advance();
          let pattern: import("../ast/surface").Pattern;
          if (patternToken.kind === "integer") pattern = { kind: "IntegerPattern", value: negative ? -patternToken.value : patternToken.value, span: this.spanFrom(patternStart) };
          else if (!negative && patternToken.kind === "string-literal") pattern = { kind: "StringPattern", value: patternToken.value, span: patternToken.span };
          else if (!negative && (patternToken.kind === "true" || patternToken.kind === "false")) pattern = { kind: "BooleanPattern", value: patternToken.kind === "true", span: patternToken.span };
          else if (!negative && patternToken.kind === "identifier" && patternToken.lexeme === "_") pattern = { kind: "WildcardPattern", span: patternToken.span };
          else this.fail("Expected a literal pattern or '_'.", patternToken.span);
          this.expect("=>");
          const armExpression = this.expression();
          this.take(";");
          arms.push({ kind: "MatchArm", pattern, expression: armExpression, span: this.spanFrom(patternStart) });
        }
        if (arms.length === 0) this.fail("A match expression requires at least one arm.");
        this.expect("}");
        return { kind: "MatchExpression", scrutinee, arms, span: this.spanFrom(start) };
      }
      default: this.fail(`Expected an expression, found ${this.describeCurrent()}.`);
    }
  }
}

/** Parser boundary for a complete lexer-produced stream from this source. */
export function parseTokens(source: SourceFile, tokens: readonly Token[]): ParseResult {
  if (tokens.length === 0 || tokens.at(-1)?.kind !== "eof" || tokens.slice(0, -1).some((token) => token.kind === "eof")) {
    throw new TypeError("Parser requires a token stream ending in exactly one EOF.");
  }
  try {
    return { ok: true, program: new Parser(source, tokens).program() };
  } catch (error: unknown) {
    if (error instanceof DiagnosticError) return { ok: false, diagnostic: error.diagnostic };
    throw error;
  }
}

/** Source-to-Surface-AST orchestration; no semantic checking or execution. */
export function parse(source: SourceFile): ParseResult {
  const result = lex(source);
  return result.ok ? parseTokens(source, result.tokens) : result;
}
