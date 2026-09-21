import type * as C from "../ast/core";
import { DiagnosticError } from "../diagnostics/diagnostic";
import type { Resolution } from "./resolver";
import { PRINT_ID, MAP_ID } from "./resolver";
import { isAssignable } from "./assignability";
import { INT, BOOL, STRING, VOID_TYPE } from "./types";
import type { Type, FunctionType } from "./types";

export interface CheckedProgram { readonly program: C.Program; readonly resolution: Resolution; readonly types: WeakMap<object, Type> }
export class TypeChecker {
  private returns: { expected: Type | null; values: Type[] } | null = null;
  readonly types = new WeakMap<object, Type>();
  readonly bindingTypes = new Map<number, Type>([[PRINT_ID, { kind: "builtin", name: "print" }], [MAP_ID, { kind: "builtin", name: "map" }]]);
  constructor(readonly resolution: Resolution) {}
  fail(message: string, node: C.Node): never { throw new DiagnosticError({ category: "Type Error", message, span: node.span }); }
  id(node: C.Node): number {
    const binding = this.resolution.bindings.get(node);
    if (binding === undefined) throw new Error("Missing resolved binding.");
    return binding.id;
  }
  expect(source: Type, destination: Type, node: C.Node): void {
    if (!isAssignable(source, destination)) this.fail(`Expected ${destination.kind}, received ${source.kind}.`, node);
  }
  value(type: Type, node: C.Node): Type {
    if (type.kind === "void" || type.kind === "builtin") this.fail("Expected a non-void first-class value.", node);
    if (type.kind === "function" && type.result === null) this.fail("Recursive functions require an explicit return annotation.", node);
    return type;
  }
  signature(node: C.FunctionDeclaration): FunctionType {
    return { kind: "function", parameters: node.parameters.map((p) => this.value(this.annotation(p.annotation), p)),
      result: node.returnType === null ? null : this.annotation(node.returnType) };
  }
  join(left: Type, right: Type, node: C.Node): Type {
    if (left.kind === "class" && right.kind === "class") {
      for (let candidate: typeof left | null = left; candidate !== null; candidate = candidate.parent) if (isAssignable(right, candidate)) return candidate;
    }
    if (isAssignable(left, right) && isAssignable(right, left)) return left;
    this.fail("Incompatible return or result types.", node);
  }
  terminates(node: C.Statement): boolean {
    if (node.kind === "ReturnStatement" || node.kind === "ThrowStatement") return true;
    if (node.kind === "BlockStatement") return node.body.some((s) => this.terminates(s));
    if (node.kind === "IfStatement") return node.elseBranch !== null && this.terminates(node.thenBranch) && this.terminates(node.elseBranch);
    if (node.kind === "TryStatement") return this.terminates(node.body) && this.terminates(node.catchBody);
    return false;
  }
  functionBody(node: C.FunctionDeclaration, type: FunctionType): void {
    node.parameters.forEach((p, i) => { const t = type.parameters[i]; if (t !== undefined) this.bindingTypes.set(this.id(p.name), t); });
    const previous = this.returns;
    const frame = { expected: type.result, values: [] as Type[] };
    this.returns = frame;
    try { node.body.body.forEach((s) => this.statement(s)); } finally { this.returns = previous; }
    if (type.result === null) type.result = frame.values.reduce((a, b) => this.join(a, b, node), frame.values[0] ?? VOID_TYPE);
    if (type.result.kind !== "void" && !this.terminates(node.body)) this.fail("Non-void function has a missing return path.", node);
    this.types.set(node, type);
  }
  annotation(node: C.TypeAnnotation): Type {
    switch (node.kind) {
      case "PrimitiveType": return { kind: node.name };
      case "ListType": return { kind: "list", element: this.value(this.annotation(node.element), node) };
      case "ReferenceType": return { kind: "reference", element: this.value(this.annotation(node.element), node) };
      case "FunctionType": return { kind: "function", parameters: node.parameters.map((p) => this.value(this.annotation(p), p)), result: this.annotation(node.result) };
      case "NamedType": {
        const type = this.bindingTypes.get(this.id(node));
        if (type?.kind !== "class") this.fail("Expected a class type.", node);
        return type;
      }
    }
  }
  expression(node: C.Expression, expected?: Type, allowBuiltin = false): Type {
    const type = this.expressionType(node, expected);
    if (type.kind === "builtin" && !allowBuiltin) this.fail("Polymorphic builtins must be called directly.", node);
    this.types.set(node, type); return type;
  }
  expressionType(node: C.Expression, _expected?: Type): Type {
    switch (node.kind) {
      case "IntegerLiteral": return INT;
      case "BooleanLiteral": return BOOL;
      case "StringLiteral": return STRING;
      case "Identifier": case "ThisExpression": {
        const type = this.bindingTypes.get(this.id(node));
        if (type === undefined) this.fail("Binding type is not available yet.", node);
        return type;
      }
      case "UnaryExpression": this.expect(this.expression(node.operand), node.operator === "not" ? BOOL : INT, node); return node.operator === "not" ? BOOL : INT;
      case "BinaryExpression": {
        const left = this.expression(node.left), right = this.expression(node.right);
        if (node.operator === "==" || node.operator === "!=") {
          if (!["int", "bool", "string"].includes(left.kind)) this.fail("Invalid equality operands.", node);
          this.expect(right, left, node); return BOOL;
        }
        this.expect(left, INT, node.left); this.expect(right, INT, node.right);
        return ["<", ">", "<=", ">="].includes(node.operator) ? BOOL : INT;
      }
      case "ConditionalExpression":
        this.expect(this.expression(node.condition), BOOL, node.condition);
        this.expect(this.expression(node.consequent), BOOL, node.consequent);
        this.expect(this.expression(node.alternative), BOOL, node.alternative); return BOOL;
      case "CallExpression": {
        const callee = this.expression(node.callee, undefined, true);
        if (callee.kind === "builtin" && callee.name === "print") {
          if (node.arguments.length !== 1) this.fail("print expects one argument.", node);
          for (const argument of node.arguments) this.value(this.expression(argument), argument);
          return VOID_TYPE;
        }
        if (callee.kind !== "function") this.fail("Expected a callable value.", node.callee);
        if (callee.result === null) this.fail("Recursive functions require an explicit return annotation.", node);
        if (node.arguments.length !== callee.parameters.length) this.fail("Wrong argument count.", node);
        node.arguments.forEach((arg, i) => { const parameter = callee.parameters[i]; if (parameter !== undefined) this.expect(this.expression(arg, parameter), parameter, arg); });
        return callee.result;
      }
      default: this.fail(`Static checking for ${node.kind} is not implemented yet.`, node);
    }
  }
  statement(node: C.Statement): void {
    switch (node.kind) {
      case "BlockStatement": node.body.forEach((s) => this.statement(s)); break;
      case "LetDeclaration": {
        const annotated = node.annotation === null ? undefined : this.annotation(node.annotation);
        const actual = this.value(this.expression(node.initializer, annotated), node.initializer);
        if (annotated !== undefined) this.expect(actual, annotated, node);
        this.bindingTypes.set(this.id(node.name), annotated ?? actual); break;
      }
      case "ExpressionStatement": this.expression(node.expression); break;
      case "FunctionDeclaration": {
        const type = this.signature(node); this.bindingTypes.set(this.id(node.name), type); this.functionBody(node, type); break;
      }
      case "ReturnStatement": {
        if (this.returns === null) this.fail("Return is only valid inside a function.", node);
        const type = node.value === null ? VOID_TYPE : this.expression(node.value, this.returns.expected ?? undefined);
        if (type.kind === "builtin" || (type.kind === "function" && type.result === null)) this.value(type, node);
        if (this.returns.expected !== null) this.expect(type, this.returns.expected, node);
        this.returns.values.push(type); break;
      }
      case "AssignmentStatement": {
        if (node.target.kind !== "Identifier") this.fail("Field assignment is not implemented yet.", node);
        if (!this.resolution.bindings.get(node.target)?.mutable) this.fail("Cannot assign a read-only binding.", node);
        const target = this.expression(node.target);
        this.expect(this.expression(node.value, target), target, node.value); break;
      }
      case "IfStatement":
        this.expect(this.expression(node.condition), BOOL, node.condition);
        this.statement(node.thenBranch); if (node.elseBranch !== null) this.statement(node.elseBranch); break;
      case "WhileStatement": this.expect(this.expression(node.condition), BOOL, node.condition); this.statement(node.body); break;
      default: this.fail(`Static checking for ${node.kind} is not implemented yet.`, node);
    }
  }
  check(program: C.Program): CheckedProgram {
    for (const node of program.body) {
      if (node.kind === "ClassDeclaration") this.fail("Classes are not implemented yet.", node);
      this.statement(node);
    }
    return { program, resolution: this.resolution, types: this.types };
  }
}
