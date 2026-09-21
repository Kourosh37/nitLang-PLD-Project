import { describe, expect, test } from "bun:test";
import type { Expression, Program } from "../src/ast/surface";
import { lex } from "../src/frontend/lexer";
import { MAX_PARSE_DEPTH, parse, parseTokens } from "../src/frontend/parser";
import { SourceFile } from "../src/frontend/source-file";

function program(text: string): Program {
  const result = parse(new SourceFile("test.nit", text));
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result.program;
}

function expression(text: string): Expression {
  const result = program(text);
  expect(result.body).toHaveLength(1);
  const statement = result.body[0];
  if (statement?.kind !== "ExpressionStatement") throw new Error("Expected expression statement.");
  return statement.expression;
}

function failure(text: string) {
  const result = parse(new SourceFile("bad.nit", text));
  if (result.ok) throw new Error(`Expected syntax error for ${text}.`);
  expect(result.diagnostic.category).toBe("Syntax Error");
  expect("program" in result).toBe(false);
  return result.diagnostic;
}

describe("expressions and precedence", () => {
  test("literal values are preserved without execution", () => {
    expect(expression("007")).toMatchObject({ kind: "IntegerLiteral", value: 7 });
    expect(expression('"a\\nb"')).toMatchObject({ kind: "StringLiteral", value: "a\nb" });
    expect(expression("false")).toMatchObject({ kind: "BooleanLiteral", value: false });
    expect(expression("true")).toMatchObject({ kind: "BooleanLiteral", value: true });
    expect(expression("unknown")).toMatchObject({ kind: "Identifier", name: "unknown" });
  });

  for (const operator of ["or", "and", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/"]) {
    test(`${operator} associates to the left`, () => {
      expect(expression(`a ${operator} b ${operator} c`)).toMatchObject({
        kind: "BinaryExpression", operator,
        left: { kind: "BinaryExpression", operator, left: { name: "a" }, right: { name: "b" } },
        right: { name: "c" },
      });
    });
  }

  for (const [lower, higher] of [["or", "and"], ["and", "=="], ["!=", "<="], [">", "+"], ["-", "*"]] as const) {
    test(`${higher} binds more tightly than ${lower} on either side`, () => {
      expect(expression(`a ${lower} b ${higher} c`)).toMatchObject({
        kind: "BinaryExpression", operator: lower, right: { kind: "BinaryExpression", operator: higher },
      });
      expect(expression(`a ${higher} b ${lower} c`)).toMatchObject({
        kind: "BinaryExpression", operator: lower, left: { kind: "BinaryExpression", operator: higher },
      });
    });
  }

  test("grouping changes precedence and preserves parentheses", () => {
    expect(expression("(1 + 2) * 3")).toMatchObject({
      kind: "BinaryExpression", operator: "*",
      left: { kind: "GroupExpression", expression: { kind: "BinaryExpression", operator: "+" } },
    });
  });

  test("unary operators associate right and calls bind more tightly", () => {
    expect(expression("not -f(2).value * 3")).toMatchObject({
      kind: "BinaryExpression", operator: "*", left: {
        kind: "UnaryExpression", operator: "not", operand: {
          kind: "UnaryExpression", operator: "-", operand: {
            kind: "MemberExpression", object: { kind: "CallExpression" }, member: { name: "value" },
          },
        },
      },
    });
  });

  test("call/member chains retain callee and argument order", () => {
    expect(expression("factory(1, 2).method(3)(4)")).toMatchObject({
      kind: "CallExpression", arguments: [{ value: 4 }], callee: {
        kind: "CallExpression", arguments: [{ value: 3 }], callee: {
          kind: "MemberExpression", member: { name: "method" },
          object: { kind: "CallExpression", callee: { name: "factory" }, arguments: [{ value: 1 }, { value: 2 }] },
        },
      },
    });
  });

  test("lambda body is greedy and may be nested", () => {
    expect(expression("lambda (x:int) -> lambda (y:int) -> x + y * 2")).toMatchObject({
      kind: "LambdaExpression", parameters: [{ name: { name: "x" } }], body: {
        kind: "LambdaExpression", parameters: [{ name: { name: "y" } }],
        body: { kind: "BinaryExpression", operator: "+", right: { operator: "*" } },
      },
    });
    expect(expression("(lambda (x:int) -> x + 1)(2)")).toMatchObject({ kind: "CallExpression", callee: { kind: "GroupExpression" } });
    expect(expression("lambda () -> 1")).toMatchObject({ parameters: [] });
  });

  test("lists, construction and references preserve surface structure", () => {
    expect(expression("[]")).toMatchObject({ kind: "ListExpression", elements: [] });
    expect(expression("[1, [2], ref x]")).toMatchObject({
      kind: "ListExpression", elements: [{ value: 1 }, { kind: "ListExpression" }, { kind: "ReferenceExpression", target: { name: "x" } }],
    });
    expect(expression("new Point(2, 3).move(1, 1)")).toMatchObject({
      kind: "CallExpression", callee: { kind: "MemberExpression", object: { kind: "NewExpression", className: { name: "Point" }, arguments: [{ value: 2 }, { value: 3 }] } },
    });
  });
});

describe("declarations, statements and types", () => {
  test("empty program, blocks, empty statements and let declarations", () => {
    expect(program("// empty").body).toEqual([]);
    expect(program("; { let x = 1; let y:int = x }").body).toMatchObject([
      { kind: "EmptyStatement" }, { kind: "BlockStatement", body: [
        { kind: "LetDeclaration", name: { name: "x" }, annotation: null, initializer: { value: 1 } },
        { kind: "LetDeclaration", annotation: { kind: "PrimitiveType", name: "int" } },
      ] },
    ]);
  });

  test("functions, return annotations, nested declarations and bare return", () => {
    expect(program("func outer(x:int):Fn(int)->int = { func inner(y:int):int = { return x + y } return inner }; func noop():void = { return; }").body).toMatchObject([
      { kind: "FunctionDeclaration", name: { name: "outer" }, parameters: [{ name: { name: "x" }, annotation: { name: "int" } }],
        returnType: { kind: "FunctionType", parameters: [{ name: "int" }], result: { name: "int" } },
        body: { body: [{ kind: "FunctionDeclaration" }, { kind: "ReturnStatement", value: { name: "inner" } }] } },
      { kind: "FunctionDeclaration", returnType: { name: "void" }, body: { body: [{ kind: "ReturnStatement", value: null }] } },
    ]);
  });

  test("nested type syntax, right-associated function results and nominal types", () => {
    expect(program("let xs:List<Ref<Animal>> = []; let f:Fn(int,List<string>)->Fn()->bool = unknown").body).toMatchObject([
      { annotation: { kind: "ListType", element: { kind: "ReferenceType", element: { kind: "NamedType", name: "Animal" } } } },
      { annotation: { kind: "FunctionType", parameters: [{ name: "int" }, { kind: "ListType", element: { name: "string" } }], result: { kind: "FunctionType", parameters: [], result: { name: "bool" } } } },
    ]);
  });

  test("ordinary assignment and write-through are distinct", () => {
    expect(program("x = 2; (object.field) = 3; getRef() := 4").body).toMatchObject([
      { kind: "AssignmentStatement", target: { kind: "Identifier", name: "x" } },
      { kind: "AssignmentStatement", target: { kind: "MemberExpression", member: { name: "field" } } },
      { kind: "ReferenceAssignmentStatement", target: { kind: "CallExpression" }, value: { value: 4 } },
    ]);
  });

  test("if, optional else, while and for sugar", () => {
    expect(program("if a and b then {} else {}; if c then {} while x < 3 do { x = x + 1 } for i in range(start(), stop()) { print(i) }").body).toMatchObject([
      { kind: "IfStatement", condition: { kind: "BinaryExpression", operator: "and" }, thenBranch: { body: [] }, elseBranch: { body: [] } },
      { kind: "IfStatement", elseBranch: null },
      { kind: "WhileStatement", body: { body: [{ kind: "AssignmentStatement" }] } },
      { kind: "ForStatement", variable: { name: "i" }, start: { kind: "CallExpression", callee: { name: "start" } }, end: { kind: "CallExpression", callee: { name: "stop" } } },
    ]);
  });

  test("try/catch and throw retain ordered statement bodies", () => {
    expect(program('try { throw "failure" } catch error { print(error); throw error }').body).toMatchObject([
      { kind: "TryStatement", body: { body: [{ kind: "ThrowStatement", value: { value: "failure" } }] }, catchName: { name: "error" }, catchBody: { body: [{ kind: "ExpressionStatement" }, { kind: "ThrowStatement" }] } },
    ]);
  });

  test("classes preserve inheritance, field and method declaration order", () => {
    expect(program("class Point extends Base { let x:int func init(a:int) = { this.x = a } let y:int; func move():void = { this.x = this.x + 1 } }; class Empty {}").body).toMatchObject([
      { kind: "ClassDeclaration", parent: { name: "Base" }, members: [
        { kind: "FieldDeclaration", name: { name: "x" }, annotation: { name: "int" } },
        { kind: "FunctionDeclaration", name: { name: "init" }, returnType: null, body: { body: [{ kind: "AssignmentStatement", target: { object: { kind: "ThisExpression" } } }] } },
        { kind: "FieldDeclaration", name: { name: "y" } },
        { kind: "FunctionDeclaration", name: { name: "move" } },
      ] }, { kind: "ClassDeclaration", parent: null, members: [] },
    ]);
  });

  test("semicolons resolve greedy continuations across insignificant newlines", () => {
    expect(program("f\n(1)").body).toMatchObject([{ expression: { kind: "CallExpression" } }]);
    expect(program("f;\n(1)").body).toHaveLength(2);
    expect(program("return\n1").body).toMatchObject([{ kind: "ReturnStatement", value: { value: 1 } }]);
  });

  test("semantic invalidity is deliberately not a parser concern", () => {
    expect(program('let x:int = "wrong"; let x = missing; this; return 1; 1 := false; class C extends C {}').body).toHaveLength(6);
  });
});

describe("syntax errors and phase contracts", () => {
  for (const text of [
    "let = 1", "let x", "let x:int", "let x =", "let x: = 1", "let x = 1.5",
    "func f(x) = {}", "func f(x:int,) = {}", "func f() {}", "func f() = { return }",
    "f(1,)", "f(,1)", "f(1", "[1,]", "[1", "[] = 2", "f() = 2", "a + b = 3", "x = y = 1",
    "if x {}", "if x then {} else if y then {}", "while x {}", "for i in range(1) {}",
    "for i in range(1,2,3) {}", "for i in things {}", "try {}", "try {} catch {}", "throw;",
    "class C { let x }", "class C { let x:int = 1 }", "class C { print(1) }", "{ class C {} }",
    "class C extends {}", "class C {", "{", "}", "(", "()", "x.", "ref 1", "ref x.y",
    "lambda (x:int) x", "lambda (x) -> x", "new C", "new C(,)", "1 +", "and true",
    "let xs:List<> = []", "let f:Fn(int,)->int = x", "let xs:List<int = []",
  ]) {
    test(`rejects ${JSON.stringify(text)}`, () => { failure(text); });
  }

  test("match stays deferred with a specific diagnostic", () => {
    expect(failure("match true { true => 1 false => 0 }").message).toContain("Milestone 21");
  });

  test("syntax errors identify the unexpected token and EOF", () => {
    const error = failure("let x = 1\r\nif x {} ");
    expect(error.message).toContain("'then'");
    expect(error.span.start).toEqual({ offset: 16, line: 2, column: 6 });
    const eof = failure("let x =");
    expect(eof.message).toContain("end of file");
    expect(eof.span.start).toEqual({ offset: 7, line: 1, column: 8 });
    expect(eof.span.end).toEqual(eof.span.start);
  });

  test("lexical errors propagate unchanged and repeated parsing is isolated", () => {
    const source = new SourceFile("error.nit", "@");
    const scanned = lex(source);
    if (scanned.ok) throw new Error("Expected lexical failure.");
    expect(parse(source)).toEqual(scanned);
    const good = new SourceFile("repeat.nit", "let x = 1");
    const first = parse(good);
    failure("let x =");
    expect(parse(good)).toEqual(first);
  });

  test("token parser requires exactly one terminal EOF", () => {
    const source = new SourceFile("empty.nit", "");
    const scanned = lex(source);
    if (!scanned.ok) throw new Error("Expected tokens.");
    expect(parseTokens(source, scanned.tokens)).toMatchObject({ ok: true, program: { body: [] } });
    expect(() => parseTokens(source, [])).toThrow(TypeError);
    expect(() => parseTokens(source, [...scanned.tokens, ...scanned.tokens])).toThrow(TypeError);
  });

  test("all recursive syntax paths reject excessive nesting as a diagnostic", () => {
    const count = MAX_PARSE_DEPTH + 10;
    for (const text of [
      "(".repeat(count) + "1" + ")".repeat(count),
      "not ".repeat(count) + "true",
      "{".repeat(count) + "}".repeat(count),
      "let xs:" + "List<".repeat(count) + "int" + ">".repeat(count) + " = []",
      "lambda () -> ".repeat(count) + "1",
    ]) expect(failure(text).message).toContain("nesting exceeds");
  });

  test("long left-associative chains parse without recursive left descent", () => {
    let node = expression(Array.from({ length: 2_000 }, () => "1").join("+"));
    let operators = 0;
    while (node.kind === "BinaryExpression") { operators += 1; node = node.left; }
    expect(operators).toBe(1_999);
  });

  test("AST spans include delimiters but exclude preceding trivia", () => {
    const source = "// comment\r\nlet x:int = (1 + 2);\r\n";
    const ast = program(source);
    expect(ast.span.start.offset).toBe(0);
    expect(ast.span.end.offset).toBe(source.length);
    const declaration = ast.body[0];
    if (declaration?.kind !== "LetDeclaration") throw new Error("Expected declaration.");
    const slice = (span: { start: { offset: number }; end: { offset: number } }) => source.slice(span.start.offset, span.end.offset);
    expect(slice(declaration.span)).toBe("let x:int = (1 + 2);");
    expect(slice(declaration.name.span)).toBe("x");
    expect(slice(declaration.initializer.span)).toBe("(1 + 2)");
    expect(declaration.span.sourceName).toBe("test.nit");
  });
});
