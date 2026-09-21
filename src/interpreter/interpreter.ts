import type * as C from "../ast/core";
import type { CheckedProgram } from "../semantic/type-checker";
import { PRINT_ID } from "../semantic/resolver";
import { Environment } from "../runtime/environment";
import { Store } from "../runtime/store";
import { applyBinary, applyUnary, formatPrimitive, requireBoolean } from "../runtime/primitive-operations";
import { intValue, boolValue, stringValue, listValue, referenceValue, VOID } from "../runtime/values";
import type { RuntimeValue } from "../runtime/values";
import { ControlSignal } from "../runtime/completion";
import type { SourceSpan } from "../frontend/source-span";
import { DiagnosticError } from "../diagnostics/diagnostic";

export class Interpreter {
  private callDepth = 0;
  readonly store = new Store();
  constructor(readonly checked: CheckedProgram, readonly output: (text: string) => void) {}
  id(node: C.Node): number {
    const binding = this.checked.resolution.bindings.get(node);
    if (binding === undefined) throw new Error("Missing binding after checking.");
    return binding.id;
  }
  invoke(callee: RuntimeValue, args: readonly RuntimeValue[], span: SourceSpan): RuntimeValue {
    if (callee.kind !== "closure") throw new DiagnosticError({ category: "Runtime Error", message: "Expected callable value.", span });
    if (this.callDepth >= 128) throw new DiagnosticError({ category: "Runtime Error", message: "Call depth limit exceeded.", span });
    const environment = new Environment(callee.environment);
    callee.parameters.forEach((p, i) => {
      const value = args[i]; if (value === undefined) throw new Error("Missing checked argument.");
      environment.define(this.id(p.name), this.store.allocate(value), p.span);
    });
    this.callDepth += 1;
    try {
      if (callee.body.kind !== "BlockStatement") return this.expression(callee.body, environment);
      for (const statement of callee.body.body) this.statement(statement, environment);
      return VOID;
    } catch (error: unknown) {
      if (error instanceof ControlSignal && error.kind === "return") return error.value;
      throw error;
    } finally { this.callDepth -= 1; }
  }
  expression(node: C.Expression, environment: Environment): RuntimeValue {
    switch (node.kind) {
      case "IntegerLiteral": return intValue(node.value, node.span);
      case "BooleanLiteral": return boolValue(node.value);
      case "StringLiteral": return stringValue(node.value);
      case "Identifier": return this.store.read(environment.lookup(this.id(node), node.span), node.span);
      case "ReferenceExpression": return referenceValue(environment.lookup(this.id(node.target), node.span));
      case "UnaryExpression": return applyUnary(node.operator, this.expression(node.operand, environment), node.span);
      case "BinaryExpression": return applyBinary(node.operator, this.expression(node.left, environment), this.expression(node.right, environment), node.span);
      case "ConditionalExpression": return this.expression(requireBoolean(this.expression(node.condition, environment), node.span) ? node.consequent : node.alternative, environment);
      case "LambdaExpression": return { kind: "closure", parameters: node.parameters, body: node.body, environment };
      case "ListExpression": return listValue(node.elements.map((item) => this.expression(item, environment)));
      case "CallExpression": {
        if (node.callee.kind === "Identifier" && this.id(node.callee) === PRINT_ID) {
          const arg = node.arguments[0];
          if (arg === undefined) throw new Error("Missing checked print argument.");
          this.output(formatPrimitive(this.expression(arg, environment), node.span)); return VOID;
        }
        if (node.callee.kind === "Identifier" && this.id(node.callee) === -2) {
          const callbackNode = node.arguments[0], listNode = node.arguments[1];
          if (callbackNode === undefined || listNode === undefined) throw new Error("Missing checked map arguments.");
          const callback = this.expression(callbackNode, environment), list = this.expression(listNode, environment);
          if (list.kind !== "list") throw new Error("Checked map list invariant failed.");
          return listValue(list.elements.map((element) => this.invoke(callback, [element], node.span)));
        }
        const callee = this.expression(node.callee, environment);
        const args = node.arguments.map((arg) => this.expression(arg, environment));
        return this.invoke(callee, args, node.span);
      }
      default: throw new Error(`Unsupported checked expression ${node.kind}.`);
    }
  }
  statement(node: C.Statement, environment: Environment): void {
    switch (node.kind) {
      case "BlockStatement": { const child = new Environment(environment); node.body.forEach((s) => this.statement(s, child)); break; }
      case "LetDeclaration": { const value = this.expression(node.initializer, environment); environment.define(this.id(node.name), this.store.allocate(value), node.span); break; }
      case "ExpressionStatement": this.expression(node.expression, environment); break;
      case "FunctionDeclaration": {
        const location = this.store.allocate();
        environment.define(this.id(node.name), location, node.span);
        this.store.write(location, { kind: "closure", parameters: node.parameters, body: node.body, environment }, node.span); break;
      }
      case "ReturnStatement": throw new ControlSignal("return", node.value === null ? VOID : this.expression(node.value, environment), node.span);
      case "AssignmentStatement": {
        const location = environment.lookup(this.id(node.target), node.span);
        this.store.write(location, this.expression(node.value, environment), node.span); break;
      }
      case "ReferenceAssignmentStatement": {
        const reference = this.expression(node.target, environment);
        if (reference.kind !== "reference") throw new Error("Checked reference invariant failed.");
        this.store.write(reference.target, this.expression(node.value, environment), node.span); break;
      }
      case "IfStatement":
        if (requireBoolean(this.expression(node.condition, environment), node.span)) this.statement(node.thenBranch, environment);
        else if (node.elseBranch !== null) this.statement(node.elseBranch, environment); break;
      case "WhileStatement": while (requireBoolean(this.expression(node.condition, environment), node.span)) this.statement(node.body, environment); break;
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
