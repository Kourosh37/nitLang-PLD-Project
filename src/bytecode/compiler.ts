import type * as C from "../ast/core";
import { DiagnosticError } from "../diagnostics/diagnostic";
import type { CheckedProgram } from "../semantic/type-checker";
import { PRINT_ID } from "../semantic/resolver";
import { boolValue, intValue, stringValue } from "../runtime/values";
import type { Chunk } from "./chunk";
import type { Instruction } from "./instruction";

export function compile(checked: CheckedProgram): Chunk {
  const instructions: Instruction[] = [];
  const binding = (node: C.Node): number => {
    const value = checked.resolution.bindings.get(node);
    if (value === undefined) throw new Error("Missing checked binding.");
    return value.id;
  };
  const unsupported = (node: C.Node): never => {
    throw new DiagnosticError({
      category: "Type Error",
      message: "The bytecode backend does not support this construct.",
      span: node.span,
    });
  };
  const emit = (instruction: Instruction): number => {
    instructions.push(instruction);
    return instructions.length - 1;
  };
  const patch = (offset: number): void => {
    const instruction = instructions[offset];
    if (instruction?.op !== "JUMP" && instruction?.op !== "JUMP_IF_FALSE")
      throw new Error("Invalid jump patch.");
    instruction.target = instructions.length;
  };
  const expression = (node: C.Expression): void => {
    switch (node.kind) {
      case "IntegerLiteral":
        emit({ op: "CONST", value: intValue(node.value, node.span), span: node.span });
        break;
      case "BooleanLiteral":
        emit({ op: "CONST", value: boolValue(node.value), span: node.span });
        break;
      case "StringLiteral":
        emit({ op: "CONST", value: stringValue(node.value), span: node.span });
        break;
      case "Identifier":
        emit({ op: "LOAD", binding: binding(node), span: node.span });
        break;
      case "UnaryExpression":
        expression(node.operand);
        emit({ op: "UNARY", operator: node.operator, span: node.span });
        break;
      case "BinaryExpression":
        expression(node.left);
        expression(node.right);
        emit({ op: "BINARY", operator: node.operator, span: node.span });
        break;
      case "ConditionalExpression": {
        expression(node.condition);
        const otherwise = emit({ op: "JUMP_IF_FALSE", target: -1, span: node.span });
        expression(node.consequent);
        const end = emit({ op: "JUMP", target: -1, span: node.span });
        patch(otherwise);
        expression(node.alternative);
        patch(end);
        break;
      }
      case "CallExpression": {
        if (
          node.callee.kind !== "Identifier" ||
          binding(node.callee) !== PRINT_ID ||
          node.arguments.length !== 1
        )
          unsupported(node);
        const argument = node.arguments[0];
        if (argument === undefined) throw new Error("Missing checked print argument.");
        expression(argument);
        emit({ op: "PRINT", span: node.span });
        // print expressions produce void, which cannot appear in a VM value context; statements suppress POP below.
        break;
      }
      default:
        unsupported(node);
    }
  };
  const statement = (node: C.Statement): void => {
    switch (node.kind) {
      case "BlockStatement":
        emit({ op: "ENTER_SCOPE", span: node.span });
        node.body.forEach(statement);
        emit({ op: "EXIT_SCOPE", span: node.span });
        break;
      case "LetDeclaration":
        expression(node.initializer);
        emit({ op: "DEFINE", binding: binding(node.name), span: node.span });
        break;
      case "AssignmentStatement":
        if (node.target.kind !== "Identifier") unsupported(node);
        expression(node.value);
        emit({ op: "STORE", binding: binding(node.target), span: node.span });
        break;
      case "ExpressionStatement":
        expression(node.expression);
        if (!(
          node.expression.kind === "CallExpression" &&
          node.expression.callee.kind === "Identifier" &&
          binding(node.expression.callee) === PRINT_ID
        ))
          emit({ op: "POP", span: node.span });
        break;
      case "IfStatement": {
        expression(node.condition);
        const otherwise = emit({ op: "JUMP_IF_FALSE", target: -1, span: node.span });
        statement(node.thenBranch);
        if (node.elseBranch === null) patch(otherwise);
        else {
          const end = emit({ op: "JUMP", target: -1, span: node.span });
          patch(otherwise);
          statement(node.elseBranch);
          patch(end);
        }
        break;
      }
      case "WhileStatement": {
        const start = instructions.length;
        expression(node.condition);
        const end = emit({ op: "JUMP_IF_FALSE", target: -1, span: node.span });
        statement(node.body);
        emit({ op: "JUMP", target: start, span: node.span });
        patch(end);
        break;
      }
      default:
        unsupported(node);
    }
  };
  for (const node of checked.program.body)
    node.kind === "ClassDeclaration" ? unsupported(node) : statement(node);
  emit({ op: "HALT", span: checked.program.span });
  return { instructions: Object.freeze(instructions) };
}
