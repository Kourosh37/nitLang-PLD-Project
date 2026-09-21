import type * as Surface from "../surface";
import type { PrimitiveBinaryOperator, UnaryOperator } from "../../language/operators";
export type { Identifier, Node, Parameter, TypeAnnotation, FieldDeclaration } from "../surface";
type Node = Surface.Node;
type Identifier = Surface.Identifier;
export type Expression =
  | Identifier
  | Extract<Surface.Expression, { kind: "IntegerLiteral" | "StringLiteral" | "BooleanLiteral" | "ThisExpression" | "ReferenceExpression" }>
  | (Node & { readonly kind: "UnaryExpression"; readonly operator: UnaryOperator; readonly operand: Expression })
  | (Node & { readonly kind: "BinaryExpression"; readonly operator: PrimitiveBinaryOperator; readonly left: Expression; readonly right: Expression })
  | (Node & { readonly kind: "ConditionalExpression"; readonly condition: Expression; readonly consequent: Expression; readonly alternative: Expression })
  | MemberExpression
  | (Node & { readonly kind: "CallExpression"; readonly callee: Expression; readonly arguments: readonly Expression[] })
  | (Node & { readonly kind: "ListExpression"; readonly elements: readonly Expression[] })
  | (Node & { readonly kind: "LambdaExpression"; readonly parameters: readonly Surface.Parameter[]; readonly body: Expression })
  | (Node & { readonly kind: "NewExpression"; readonly className: Identifier; readonly arguments: readonly Expression[] })
  | MatchExpression;
export interface MatchArm extends Node { readonly kind: "MatchArm"; readonly pattern: Surface.Pattern; readonly expression: Expression }
export interface MatchExpression extends Node { readonly kind: "MatchExpression"; readonly scrutinee: Expression; readonly arms: readonly MatchArm[] }
export interface MemberExpression extends Node { readonly kind: "MemberExpression"; readonly object: Expression; readonly member: Identifier }
export interface BlockStatement extends Node { readonly kind: "BlockStatement"; readonly body: readonly Statement[] }
export interface FunctionDeclaration extends Omit<Surface.FunctionDeclaration, "body"> { readonly body: BlockStatement }
export interface ClassDeclaration extends Omit<Surface.ClassDeclaration, "members"> { readonly members: readonly (Surface.FieldDeclaration | FunctionDeclaration)[] }
export type Statement =
  | BlockStatement | FunctionDeclaration
  | (Node & { readonly kind: "LetDeclaration"; readonly name: Identifier; readonly annotation: Surface.TypeAnnotation | null; readonly initializer: Expression })
  | (Node & { readonly kind: "ExpressionStatement"; readonly expression: Expression })
  | (Node & { readonly kind: "AssignmentStatement"; readonly target: Identifier | MemberExpression; readonly value: Expression })
  | (Node & { readonly kind: "ReferenceAssignmentStatement"; readonly target: Expression; readonly value: Expression })
  | (Node & { readonly kind: "IfStatement"; readonly condition: Expression; readonly thenBranch: BlockStatement; readonly elseBranch: BlockStatement | null })
  | (Node & { readonly kind: "WhileStatement"; readonly condition: Expression; readonly body: BlockStatement })
  | (Node & { readonly kind: "ReturnStatement"; readonly value: Expression | null })
  | (Node & { readonly kind: "ThrowStatement"; readonly value: Expression })
  | (Node & { readonly kind: "TryStatement"; readonly body: BlockStatement; readonly catchName: Identifier; readonly catchBody: BlockStatement });
export type TopLevelItem = Statement | ClassDeclaration;
export interface Program extends Node { readonly kind: "Program"; readonly body: readonly TopLevelItem[] }
