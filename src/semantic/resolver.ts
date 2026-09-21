import type * as C from "../ast/core";
import { SymbolTable } from "./symbols/symbol-table";
import type { Binding } from "./symbols/symbol-table";

export const PRINT_ID = -1;
export const MAP_ID = -2;
export interface Resolution { readonly bindings: WeakMap<object, Binding>; readonly receivers: WeakMap<C.FunctionDeclaration, Binding> }
export function resolve(program: C.Program): Resolution {
  const bindings = new WeakMap<object, Binding>();
  const receivers = new WeakMap<C.FunctionDeclaration, Binding>();
  let next = 0;
  let scope = new SymbolTable();
  scope.define({ id: PRINT_ID, name: "print", mutable: false }, program.span);
  scope.define({ id: MAP_ID, name: "map", mutable: false }, program.span);
  scope = new SymbolTable(scope);
  const scoped = (action: () => void) => { const previous = scope; scope = new SymbolTable(scope); try { action(); } finally { scope = previous; } };
  const defineBinding = (name: C.Identifier, mutable: boolean): Binding => {
    const binding = { id: next++, name: name.name, mutable };
    scope.define(binding, name.span); bindings.set(name, binding); return binding;
  };
  const use = (node: C.Node, name: string) => { bindings.set(node, scope.lookup(name, node.span)); };
  const annotation = (type: C.TypeAnnotation): void => {
    if (type.kind === "NamedType") use(type, type.name);
    else if (type.kind === "ListType" || type.kind === "ReferenceType") annotation(type.element);
    else if (type.kind === "FunctionType") { type.parameters.forEach(annotation); annotation(type.result); }
  };
  const parameters = (params: readonly C.Parameter[]) => { for (const p of params) { annotation(p.annotation); defineBinding(p.name, true); } };
  const func = (node: C.FunctionDeclaration, method = false): void => {
    if (!method) defineBinding(node.name, false);
    if (node.returnType !== null) annotation(node.returnType);
    scoped(() => {
      if (method) {
        const self: C.Identifier = { kind: "Identifier", name: "this", span: node.span };
        receivers.set(node, defineBinding(self, false));
      }
      parameters(node.parameters); node.body.body.forEach(statement);
    });
  };
  const expression = (node: C.Expression): void => {
    switch (node.kind) {
      case "Identifier": use(node, node.name); break;
      case "ThisExpression": use(node, "this"); break;
      case "ReferenceExpression": use(node.target, node.target.name); break;
      case "UnaryExpression": expression(node.operand); break;
      case "BinaryExpression": expression(node.left); expression(node.right); break;
      case "ConditionalExpression": expression(node.condition); expression(node.consequent); expression(node.alternative); break;
      case "CallExpression": expression(node.callee); node.arguments.forEach(expression); break;
      case "MemberExpression": expression(node.object); break;
      case "NewExpression": use(node.className, node.className.name); node.arguments.forEach(expression); break;
      case "ListExpression": node.elements.forEach(expression); break;
      case "LambdaExpression": scoped(() => { parameters(node.parameters); expression(node.body); }); break;
      case "MatchExpression": expression(node.scrutinee); node.arms.forEach((arm) => expression(arm.expression)); break;
    }
  };
  const block = (node: C.BlockStatement) => scoped(() => node.body.forEach(statement));
  const statement = (node: C.Statement): void => {
    switch (node.kind) {
      case "BlockStatement": block(node); break;
      case "LetDeclaration": if (node.annotation !== null) annotation(node.annotation); expression(node.initializer); defineBinding(node.name, true); break;
      case "FunctionDeclaration": func(node); break;
      case "ExpressionStatement": expression(node.expression); break;
      case "AssignmentStatement": expression(node.target); expression(node.value); break;
      case "ReferenceAssignmentStatement": expression(node.target); expression(node.value); break;
      case "IfStatement": expression(node.condition); block(node.thenBranch); if (node.elseBranch !== null) block(node.elseBranch); break;
      case "WhileStatement": expression(node.condition); block(node.body); break;
      case "ReturnStatement": if (node.value !== null) expression(node.value); break;
      case "ThrowStatement": expression(node.value); break;
      case "TryStatement": block(node.body); scoped(() => { defineBinding(node.catchName, true); node.catchBody.body.forEach(statement); }); break;
    }
  };
  for (const node of program.body) {
    if (node.kind !== "ClassDeclaration") statement(node);
    else {
      defineBinding(node.name, false);
      if (node.parent !== null) use(node.parent, node.parent.name);
      for (const member of node.members) {
        if (member.kind === "FieldDeclaration") annotation(member.annotation);
        else func(member, true);
      }
    }
  }
  return { bindings, receivers };
}
