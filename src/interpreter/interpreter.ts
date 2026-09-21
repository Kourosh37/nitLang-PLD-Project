import type * as C from "../ast/core";
import type { CheckedProgram } from "../semantic/type-checker";
import { PRINT_ID } from "../semantic/resolver";
import { Environment } from "../runtime/environment";
import { Store } from "../runtime/store";
import { applyBinary, applyUnary, formatPrimitive, requireBoolean } from "../runtime/primitive-operations";
import { intValue, boolValue, stringValue, VOID } from "../runtime/values";
import type { RuntimeValue } from "../runtime/values";

export class Interpreter {
  readonly store = new Store();
  constructor(readonly checked: CheckedProgram, readonly output: (text: string) => void) {}
  id(node: C.Node): number {
    const binding = this.checked.resolution.bindings.get(node);
    if (binding === undefined) throw new Error("Missing binding after checking.");
    return binding.id;
  }
  expression(node: C.Expression, environment: Environment): RuntimeValue {
    switch (node.kind) {
      case "IntegerLiteral": return intValue(node.value, node.span);
      case "BooleanLiteral": return boolValue(node.value);
      case "StringLiteral": return stringValue(node.value);
      case "Identifier": return this.store.read(environment.lookup(this.id(node), node.span), node.span);
      case "UnaryExpression": return applyUnary(node.operator, this.expression(node.operand, environment), node.span);
      case "BinaryExpression": return applyBinary(node.operator, this.expression(node.left, environment), this.expression(node.right, environment), node.span);
      case "ConditionalExpression": return this.expression(requireBoolean(this.expression(node.condition, environment), node.span) ? node.consequent : node.alternative, environment);
      case "CallExpression": {
        if (node.callee.kind === "Identifier" && this.id(node.callee) === PRINT_ID) {
          const arg = node.arguments[0];
          if (arg === undefined) throw new Error("Missing checked print argument.");
          this.output(formatPrimitive(this.expression(arg, environment), node.span)); return VOID;
        }
        throw new Error("Unsupported checked call.");
      }
      default: throw new Error(`Unsupported checked expression ${node.kind}.`);
    }
  }
  statement(node: C.Statement, environment: Environment): void {
    switch (node.kind) {
      case "BlockStatement": { const child = new Environment(environment); node.body.forEach((s) => this.statement(s, child)); break; }
      case "LetDeclaration": { const value = this.expression(node.initializer, environment); environment.define(this.id(node.name), this.store.allocate(value), node.span); break; }
      case "ExpressionStatement": this.expression(node.expression, environment); break;
      default: throw new Error(`Unsupported checked statement ${node.kind}.`);
    }
  }
  run(): void {
    const environment = new Environment();
    for (const node of this.checked.program.body) {
      if (node.kind === "ClassDeclaration") throw new Error("Unsupported checked class.");
      this.statement(node, environment);
    }
  }
}
