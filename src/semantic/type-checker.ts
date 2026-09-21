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
  private readonly classes = new Map<number, Type & { kind: "class" }>();
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
  expressionType(node: C.Expression, expected?: Type): Type {
    switch (node.kind) {
      case "IntegerLiteral": return INT;
      case "BooleanLiteral": return BOOL;
      case "StringLiteral": return STRING;
      case "Identifier": case "ThisExpression": {
        const type = this.bindingTypes.get(this.id(node));
        if (type === undefined) this.fail("Binding type is not available yet.", node);
        return type;
      }
      case "MemberExpression": {
        const object = this.expression(node.object);
        if (object.kind !== "class") this.fail("Member access requires an object.", node.object);
        const field = object.fields.get(node.member.name); if (field !== undefined) return field;
        const method = object.methods.get(node.member.name); if (method !== undefined && node.member.name !== "init") return method;
        this.fail(`Unknown member '${node.member.name}'.`, node.member);
      }
      case "NewExpression": {
        const type = this.bindingTypes.get(this.id(node.className));
        if (type?.kind !== "class") this.fail("new requires a class name.", node.className);
        const init = type.methods.get("init");
        const parameters = init?.parameters ?? [];
        if (node.arguments.length !== parameters.length) this.fail("Wrong constructor argument count.", node);
        node.arguments.forEach((arg, i) => { const p = parameters[i]; if (p !== undefined) this.expect(this.expression(arg, p), p, arg); });
        return type;
      }
      case "ReferenceExpression": {
        const binding = this.resolution.bindings.get(node.target);
        if (binding === undefined || !binding.mutable) this.fail("ref requires an assignable variable.", node);
        const element = this.bindingTypes.get(binding.id);
        if (element === undefined) this.fail("Binding type is not available yet.", node);
        return { kind: "reference", element: this.value(element, node) };
      }
      case "UnaryExpression": this.expect(this.expression(node.operand), node.operator === "not" ? BOOL : INT, node); return node.operator === "not" ? BOOL : INT;
      case "BinaryExpression": {
        const left = this.expression(node.left), right = this.expression(node.right);
        if (node.operator === "==" || node.operator === "!=") {
          if (!["int", "bool", "string", "class"].includes(left.kind)) this.fail("Invalid equality operands.", node);
          this.expect(right, left, node); return BOOL;
        }
        this.expect(left, INT, node.left); this.expect(right, INT, node.right);
        return ["<", ">", "<=", ">="].includes(node.operator) ? BOOL : INT;
      }
      case "ConditionalExpression":
        this.expect(this.expression(node.condition), BOOL, node.condition);
        this.expect(this.expression(node.consequent), BOOL, node.consequent);
        this.expect(this.expression(node.alternative), BOOL, node.alternative); return BOOL;
      case "LambdaExpression": {
        const parameters = node.parameters.map((parameter) => {
          const type = this.value(this.annotation(parameter.annotation), parameter);
          this.bindingTypes.set(this.id(parameter.name), type);
          return type;
        });
        return { kind: "function", parameters, result: this.value(this.expression(node.body), node.body) };
      }
      case "ListExpression": {
        if (node.elements.length === 0) {
          if (expected?.kind !== "list") this.fail("Empty list requires an expected List type.", node);
          return expected;
        }
        const element = this.value(this.expression(node.elements[0] as C.Expression), node);
        for (const item of node.elements.slice(1)) this.expect(this.expression(item, element), element, item);
        return { kind: "list", element };
      }
      case "MatchExpression": {
        const scrutinee = this.expression(node.scrutinee);
        if (scrutinee.kind !== "int" && scrutinee.kind !== "bool" && scrutinee.kind !== "string") this.fail("match requires a primitive scrutinee.", node.scrutinee);
        const seen = new Set<string>(); let wildcard = false; let hasTrue = false; let hasFalse = false; let result: Type | null = null;
        node.arms.forEach((arm, index) => {
          if (wildcard) this.fail("A wildcard match arm must be last.", arm);
          const patternType = arm.pattern.kind === "IntegerPattern" ? "int" : arm.pattern.kind === "StringPattern" ? "string" : arm.pattern.kind === "BooleanPattern" ? "bool" : null;
          if (patternType === null) wildcard = true;
          else {
            if (patternType !== scrutinee.kind) this.fail("Pattern type does not match the scrutinee.", arm.pattern);
            const patternValue = arm.pattern.kind === "IntegerPattern" || arm.pattern.kind === "StringPattern" || arm.pattern.kind === "BooleanPattern" ? arm.pattern.value : "_";
            const key = `${patternType}:${String(patternValue)}`; if (seen.has(key)) this.fail("Duplicate match pattern.", arm.pattern); seen.add(key);
            if (arm.pattern.kind === "BooleanPattern") { if (arm.pattern.value) hasTrue = true; else hasFalse = true; }
          }
          const armType = this.value(this.expression(arm.expression, expected), arm.expression);
          result = result === null ? armType : this.join(result, armType, arm);
          if (index === node.arms.length - 1 && !wildcard && !(scrutinee.kind === "bool" && hasTrue && hasFalse)) this.fail("Non-exhaustive match requires a final wildcard.", node);
        });
        if (result === null) this.fail("A match expression requires an arm.", node);
        return result;
      }
      case "CallExpression": {
        const callee = this.expression(node.callee, undefined, true);
        if (callee.kind === "builtin" && callee.name === "print") {
          if (node.arguments.length !== 1) this.fail("print expects one argument.", node);
          for (const argument of node.arguments) {
            const type = this.expression(argument);
            if (type.kind !== "thrown") this.value(type, argument);
          }
          return VOID_TYPE;
        }
        if (callee.kind === "builtin" && callee.name === "map") {
          if (node.arguments.length !== 2) this.fail("map expects two arguments.", node);
          const callbackNode = node.arguments[0], listNode = node.arguments[1];
          if (callbackNode === undefined || listNode === undefined) this.fail("map expects two arguments.", node);
          const list = this.expression(listNode);
          if (list.kind !== "list") this.fail("map second argument must be a list.", listNode);
          const callback = this.expression(callbackNode);
          if (callback.kind !== "function" || callback.parameters.length !== 1 || callback.result === null || callback.result.kind === "void") this.fail("map callback must be a one-argument value function.", callbackNode);
          const parameter = callback.parameters[0]; if (parameter === undefined) this.fail("map callback requires one parameter.", callbackNode);
          this.expect(list.element, parameter, listNode);
          return { kind: "list", element: callback.result };
        }
        if (callee.kind !== "function") this.fail("Expected a callable value.", node.callee);
        if (callee.result === null) this.fail("Recursive functions require an explicit return annotation.", node);
        if (node.arguments.length !== callee.parameters.length) this.fail("Wrong argument count.", node);
        node.arguments.forEach((arg, i) => { const parameter = callee.parameters[i]; if (parameter !== undefined) this.expect(this.expression(arg, parameter), parameter, arg); });
        return callee.result;
      }
      default: throw new Error("Unsupported expression reached the checker.");
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
      case "ThrowStatement": this.value(this.expression(node.value), node.value); break;
      case "TryStatement": {
        this.statement(node.body);
        this.bindingTypes.set(this.id(node.catchName), { kind: "thrown" });
        this.statement(node.catchBody); break;
      }
      case "AssignmentStatement": {
        if (node.target.kind === "MemberExpression") {
          const field = this.expression(node.target);
          this.expect(this.expression(node.value, field), field, node.value); break;
        }
        if (!this.resolution.bindings.get(node.target)?.mutable) this.fail("Cannot assign a read-only binding.", node);
        const target = this.expression(node.target);
        this.expect(this.expression(node.value, target), target, node.value); break;
      }
      case "ReferenceAssignmentStatement": {
        const reference = this.expression(node.target);
        if (reference.kind !== "reference") this.fail("':=' target must have Ref type.", node.target);
        this.expect(this.expression(node.value, reference.element), reference.element, node.value); break;
      }
      case "IfStatement":
        this.expect(this.expression(node.condition), BOOL, node.condition);
        this.statement(node.thenBranch); if (node.elseBranch !== null) this.statement(node.elseBranch); break;
      case "WhileStatement": this.expect(this.expression(node.condition), BOOL, node.condition); this.statement(node.body); break;
      default: throw new Error("Unsupported statement reached the checker.");
    }
  }
  check(program: C.Program): CheckedProgram {
    for (const node of program.body) {
      if (node.kind !== "ClassDeclaration") { this.statement(node); continue; }
      let parent: (Type & { kind: "class" }) | null = null;
      if (node.parent !== null) {
        const candidate = this.bindingTypes.get(this.id(node.parent));
        if (candidate?.kind !== "class") this.fail("Parent must be a previously declared class.", node.parent);
        if (candidate.id === this.id(node.name)) this.fail("A class cannot inherit from itself.", node.parent);
        parent = candidate;
      }
      const type: Type & { kind: "class" } = { kind: "class", id: this.id(node.name), name: node.name.name, parent, fields: new Map(parent?.fields), methods: new Map(parent?.methods) };
      this.classes.set(type.id, type); this.bindingTypes.set(type.id, type);
      for (const member of node.members) {
        if (member.kind === "FieldDeclaration") {
          if (type.fields.has(member.name.name) || type.methods.has(member.name.name)) this.fail(`Duplicate member '${member.name.name}'.`, member);
          type.fields.set(member.name.name, this.value(this.annotation(member.annotation), member));
        } else {
          if (type.fields.has(member.name.name)) this.fail(`Duplicate member '${member.name.name}'.`, member);
          const signature = this.signature(member); if (member.name.name === "init") signature.result = VOID_TYPE;
          const overridden = parent?.methods.get(member.name.name);
          if (overridden !== undefined && member.name.name !== "init" && !isAssignable(signature, overridden)) this.fail(`Incompatible override '${member.name.name}'.`, member);
          type.methods.set(member.name.name, signature);
        }
      }
      for (const member of node.members) if (member.kind === "FunctionDeclaration") {
        const receiver = this.resolution.receivers.get(member); if (receiver === undefined) throw new Error("Missing method receiver binding.");
        this.bindingTypes.set(receiver.id, type);
        const signature = type.methods.get(member.name.name); if (signature === undefined) throw new Error("Missing method signature.");
        this.functionBody(member, signature);
      }
    }
    return { program, resolution: this.resolution, types: this.types };
  }
}
