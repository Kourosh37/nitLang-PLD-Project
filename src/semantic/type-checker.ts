import type * as C from "../ast/core";
import { DiagnosticError } from "../diagnostics/diagnostic";
import type { Resolution } from "./resolver";
import { PRINT_ID, MAP_ID } from "./resolver";
import { isAssignable } from "./assignability";
import { INT, BOOL, STRING, VOID_TYPE } from "./types";
import type { Type } from "./types";

export interface CheckedProgram { readonly program: C.Program; readonly resolution: Resolution; readonly types: WeakMap<object, Type> }
export class TypeChecker {
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
    return type;
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
        this.fail("Calls are not implemented for this value yet.", node);
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
