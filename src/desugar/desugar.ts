import type * as S from "../ast/surface";
import type * as C from "../ast/core";

class Lowerer {
  private next = 0;
  expression(node: S.Expression): C.Expression {
    switch (node.kind) {
      case "GroupExpression": return { ...this.expression(node.expression), span: node.span };
      case "UnaryExpression": return { ...node, operand: this.expression(node.operand) };
      case "BinaryExpression": {
        const left = this.expression(node.left), right = this.expression(node.right);
        if (node.operator === "and" || node.operator === "or") {
          const constant: C.Expression = { kind: "BooleanLiteral", value: node.operator === "or", span: node.span };
          return { kind: "ConditionalExpression", condition: left, consequent: node.operator === "and" ? right : constant,
            alternative: node.operator === "and" ? constant : right, span: node.span };
        }
        return { ...node, operator: node.operator, left, right };
      }
      case "MemberExpression": return { ...node, object: this.expression(node.object) };
      case "CallExpression": return { ...node, callee: this.expression(node.callee), arguments: node.arguments.map((arg) => this.expression(arg)) };
      case "NewExpression": return { ...node, arguments: node.arguments.map((arg) => this.expression(arg)) };
      case "ListExpression": return { ...node, elements: node.elements.map((item) => this.expression(item)) };
      case "LambdaExpression": return { ...node, body: this.expression(node.body) };
      case "MatchExpression": return { ...node, scrutinee: this.expression(node.scrutinee), arms: node.arms.map((arm) => ({ ...arm, expression: this.expression(arm.expression) })) };
      default: return node;
    }
  }
  block(node: S.BlockStatement): C.BlockStatement { return { ...node, body: node.body.flatMap((s) => this.statement(s)) }; }
  function(node: S.FunctionDeclaration): C.FunctionDeclaration { return { ...node, body: this.block(node.body) }; }
  statement(node: S.Statement): C.Statement[] {
    switch (node.kind) {
      case "EmptyStatement": return [];
      case "BlockStatement": return [this.block(node)];
      case "FunctionDeclaration": return [this.function(node)];
      case "LetDeclaration": return [{ ...node, initializer: this.expression(node.initializer) }];
      case "ExpressionStatement": return [{ ...node, expression: this.expression(node.expression) }];
      case "AssignmentStatement": return [{ ...node, target: node.target.kind === "Identifier" ? node.target : { ...node.target, object: this.expression(node.target.object) }, value: this.expression(node.value) }];
      case "ReferenceAssignmentStatement": return [{ ...node, target: this.expression(node.target), value: this.expression(node.value) }];
      case "IfStatement": return [{ ...node, condition: this.expression(node.condition), thenBranch: this.block(node.thenBranch), elseBranch: node.elseBranch === null ? null : this.block(node.elseBranch) }];
      case "WhileStatement": return [{ ...node, condition: this.expression(node.condition), body: this.block(node.body) }];
      case "ReturnStatement": return [{ ...node, value: node.value === null ? null : this.expression(node.value) }];
      case "ThrowStatement": return [{ ...node, value: this.expression(node.value) }];
      case "TryStatement": return [{ ...node, body: this.block(node.body), catchBody: this.block(node.catchBody) }];
      case "ForStatement": {
        const span = node.span;
        const start: C.Identifier = { kind: "Identifier", name: `@rangeStart${this.next++}`, span };
        const end: C.Identifier = { kind: "Identifier", name: `@rangeEnd${this.next++}`, span };
        const annotation: C.TypeAnnotation = { kind: "PrimitiveType", name: "int", span };
        return [{ kind: "BlockStatement", span, body: [
          { kind: "LetDeclaration", name: start, annotation, initializer: this.expression(node.start), span },
          { kind: "LetDeclaration", name: end, annotation, initializer: this.expression(node.end), span },
          { kind: "LetDeclaration", name: node.variable, annotation, initializer: { ...start }, span },
          { kind: "WhileStatement", condition: { kind: "BinaryExpression", operator: "<", left: { ...node.variable }, right: { ...end }, span }, span,
            body: { kind: "BlockStatement", span, body: [this.block(node.body),
              { kind: "AssignmentStatement", target: { ...node.variable }, value: { kind: "BinaryExpression", operator: "+", left: { ...node.variable }, right: { kind: "IntegerLiteral", value: 1, span }, span }, span },
            ] } },
        ] }];
      }
    }
  }
  program(node: S.Program): C.Program {
    return { ...node, body: node.body.flatMap((item): C.TopLevelItem[] => item.kind === "ClassDeclaration"
      ? [{ ...item, members: item.members.map((member) => member.kind === "FunctionDeclaration" ? this.function(member) : member) }]
      : this.statement(item)) };
  }
}
export function desugar(program: S.Program): C.Program { return new Lowerer().program(program); }
