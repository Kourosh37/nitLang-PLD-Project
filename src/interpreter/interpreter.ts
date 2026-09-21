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
import type { ClassValue, ObjectValue } from "../runtime/class";

export class Interpreter {
  private callDepth = 0;
  readonly store = new Store();
  constructor(readonly checked: CheckedProgram, readonly output: (text: string) => void) {}
  id(node: C.Node): number {
    const binding = this.checked.resolution.bindings.get(node);
    if (binding === undefined) throw new Error("Missing binding after checking.");
    return binding.id;
  }
  method(classValue: ClassValue, name: string): C.FunctionDeclaration | undefined {
    return classValue.methods.get(name) ?? (classValue.parent === null ? undefined : this.method(classValue.parent, name));
  }
  allFields(classValue: ClassValue): string[] {
    return [...(classValue.parent === null ? [] : this.allFields(classValue.parent)), ...classValue.fields];
  }
  invoke(callee: RuntimeValue, args: readonly RuntimeValue[], span: SourceSpan): RuntimeValue {
    if (callee.kind === "bound-method") {
      const receiver = this.checked.resolution.receivers.get(callee.method);
      if (receiver === undefined) throw new Error("Missing checked receiver.");
      const closure = { kind: "closure" as const, parameters: callee.method.parameters, body: callee.method.body, environment: callee.environment };
      const environment = new Environment(closure.environment);
      environment.define(receiver.id, this.store.allocate(callee.receiver), span);
      closure.parameters.forEach((p, i) => { const value = args[i]; if (value === undefined) throw new Error("Missing checked argument."); environment.define(this.id(p.name), this.store.allocate(value), p.span); });
      this.callDepth += 1;
      try { for (const statement of closure.body.body) this.statement(statement, environment); return VOID; }
      catch (error: unknown) { if (error instanceof ControlSignal && error.kind === "return") return error.value; throw error; }
      finally { this.callDepth -= 1; }
    }
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
      case "ThisExpression": return this.store.read(environment.lookup(this.id(node), node.span), node.span);
      case "ReferenceExpression": return referenceValue(environment.lookup(this.id(node.target), node.span));
      case "UnaryExpression": return applyUnary(node.operator, this.expression(node.operand, environment), node.span);
      case "BinaryExpression": return applyBinary(node.operator, this.expression(node.left, environment), this.expression(node.right, environment), node.span);
      case "ConditionalExpression": return this.expression(requireBoolean(this.expression(node.condition, environment), node.span) ? node.consequent : node.alternative, environment);
      case "LambdaExpression": return { kind: "closure", parameters: node.parameters, body: node.body, environment };
      case "ListExpression": return listValue(node.elements.map((item) => this.expression(item, environment)));
      case "MemberExpression": {
        const object = this.expression(node.object, environment);
        if (object.kind !== "object") throw new Error("Checked member invariant failed.");
        const field = object.fields.get(node.member.name);
        if (field !== undefined) return this.store.read(field, node.span);
        const method = this.method(object.classValue, node.member.name);
        if (method === undefined) throw new Error("Checked method invariant failed.");
        return { kind: "bound-method", method, receiver: object, environment: object.classValue.environment };
      }
      case "NewExpression": {
        const value = this.store.read(environment.lookup(this.id(node.className), node.span), node.span);
        if (value.kind !== "class") throw new Error("Checked constructor invariant failed.");
        const fields = new Map<string, import("../runtime/location").Location>();
        for (const name of this.allFields(value)) fields.set(name, this.store.allocate());
        const object: ObjectValue = { kind: "object", classValue: value, fields };
        const init = this.method(value, "init");
        if (init !== undefined) this.invoke({ kind: "bound-method", method: init, receiver: object, environment: value.environment }, node.arguments.map((a) => this.expression(a, environment)), node.span);
        for (const location of fields.values()) this.store.read(location, node.span);
        return object;
      }
      case "MatchExpression": {
        const value = this.expression(node.scrutinee, environment);
        for (const arm of node.arms) {
          const pattern = arm.pattern;
          const matches = pattern.kind === "WildcardPattern" ||
            (pattern.kind === "IntegerPattern" && value.kind === "int" && value.value === pattern.value) ||
            (pattern.kind === "StringPattern" && value.kind === "string" && value.value === pattern.value) ||
            (pattern.kind === "BooleanPattern" && value.kind === "bool" && value.value === pattern.value);
          if (matches) return this.expression(arm.expression, environment);
        }
        throw new Error("Checked exhaustive match had no selected arm.");
      }
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
      default: throw new Error("Unsupported checked expression.");
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
      case "ThrowStatement": throw new ControlSignal("throw", this.expression(node.value, environment), node.span);
      case "TryStatement": {
        try { this.statement(node.body, environment); }
        catch (error: unknown) {
          if (!(error instanceof ControlSignal) || error.kind !== "throw") throw error;
          const catchEnvironment = new Environment(environment);
          catchEnvironment.define(this.id(node.catchName), this.store.allocate(error.value), node.catchName.span);
          for (const statement of node.catchBody.body) this.statement(statement, catchEnvironment);
        }
        break;
      }
      case "AssignmentStatement": {
        if (node.target.kind === "MemberExpression") {
          const object = this.expression(node.target.object, environment);
          if (object.kind !== "object") throw new Error("Checked field assignment invariant failed.");
          const location = object.fields.get(node.target.member.name); if (location === undefined) throw new Error("Missing checked field.");
          this.store.write(location, this.expression(node.value, environment), node.span); break;
        }
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
      default: throw new Error("Unsupported checked statement.");
    }
  }
  run(): void {
    const environment = new Environment();
    for (const node of this.checked.program.body) {
      if (node.kind === "ClassDeclaration") {
        const methods = new Map(node.members.filter((m): m is C.FunctionDeclaration => m.kind === "FunctionDeclaration").map((m) => [m.name.name, m]));
        const fields = node.members.filter((m) => m.kind === "FieldDeclaration").map((m) => m.name.name);
        let parent: ClassValue | null = null;
        if (node.parent !== null) {
          const candidate = this.store.read(environment.lookup(this.id(node.parent), node.span), node.span);
          if (candidate.kind !== "class") throw new Error("Checked parent invariant failed."); parent = candidate;
        }
        const value: ClassValue = { kind: "class", name: node.name.name, parent, fields, methods, environment };
        environment.define(this.id(node.name), this.store.allocate(value), node.span);
      } else this.statement(node, environment);
    }
  }
}
