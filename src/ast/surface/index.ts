import type { SourceSpan } from "../../frontend/source-span";
import type { BinaryOperator, UnaryOperator } from "../../language/operators";
export type { BinaryOperator } from "../../language/operators";

export interface Node {
  readonly span: SourceSpan;
}
export interface Identifier extends Node {
  readonly kind: "Identifier";
  readonly name: string;
}
export interface Program extends Node {
  readonly kind: "Program";
  readonly body: readonly TopLevelItem[];
}
export type TopLevelItem = Statement | ClassDeclaration;

/** Syntax for an annotation, not a resolved semantic type. */
export type TypeAnnotation =
  | (Node & { readonly kind: "PrimitiveType"; readonly name: "int" | "bool" | "string" | "void" })
  | (Node & { readonly kind: "NamedType"; readonly name: string })
  | (Node & { readonly kind: "ListType" | "ReferenceType"; readonly element: TypeAnnotation })
  | (Node & {
      readonly kind: "FunctionType";
      readonly parameters: readonly TypeAnnotation[];
      readonly result: TypeAnnotation;
    });

export interface Parameter extends Node {
  readonly kind: "Parameter";
  readonly name: Identifier;
  readonly annotation: TypeAnnotation;
}

export type Expression =
  | Identifier
  | (Node & { readonly kind: "IntegerLiteral"; readonly value: number })
  | (Node & { readonly kind: "StringLiteral"; readonly value: string })
  | (Node & { readonly kind: "BooleanLiteral"; readonly value: boolean })
  | (Node & { readonly kind: "ThisExpression" })
  | (Node & { readonly kind: "GroupExpression"; readonly expression: Expression })
  | (Node & {
      readonly kind: "UnaryExpression";
      readonly operator: UnaryOperator;
      readonly operand: Expression;
    })
  | (Node & { readonly kind: "ReferenceExpression"; readonly target: Identifier })
  | (Node & {
      readonly kind: "BinaryExpression";
      readonly operator: BinaryOperator;
      readonly left: Expression;
      readonly right: Expression;
    })
  | MemberExpression
  | (Node & {
      readonly kind: "CallExpression";
      readonly callee: Expression;
      readonly arguments: readonly Expression[];
    })
  | (Node & { readonly kind: "ListExpression"; readonly elements: readonly Expression[] })
  | (Node & {
      readonly kind: "LambdaExpression";
      readonly parameters: readonly Parameter[];
      readonly body: Expression;
    })
  | (Node & {
      readonly kind: "NewExpression";
      readonly className: Identifier;
      readonly arguments: readonly Expression[];
    })
  | MatchExpression;
export type Pattern =
  | (Node & { readonly kind: "IntegerPattern"; readonly value: number })
  | (Node & { readonly kind: "StringPattern"; readonly value: string })
  | (Node & { readonly kind: "BooleanPattern"; readonly value: boolean })
  | (Node & { readonly kind: "WildcardPattern" });
export interface MatchArm extends Node {
  readonly kind: "MatchArm";
  readonly pattern: Pattern;
  readonly expression: Expression;
}
export interface MatchExpression extends Node {
  readonly kind: "MatchExpression";
  readonly scrutinee: Expression;
  readonly arms: readonly MatchArm[];
}

export interface MemberExpression extends Node {
  readonly kind: "MemberExpression";
  readonly object: Expression;
  readonly member: Identifier;
}

export interface BlockStatement extends Node {
  readonly kind: "BlockStatement";
  readonly body: readonly Statement[];
}

export interface FunctionDeclaration extends Node {
  readonly kind: "FunctionDeclaration";
  readonly name: Identifier;
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeAnnotation | null;
  readonly body: BlockStatement;
}

export type Statement =
  | BlockStatement
  | FunctionDeclaration
  | (Node & { readonly kind: "EmptyStatement" })
  | (Node & {
      readonly kind: "LetDeclaration";
      readonly name: Identifier;
      readonly annotation: TypeAnnotation | null;
      readonly initializer: Expression;
    })
  | (Node & { readonly kind: "ExpressionStatement"; readonly expression: Expression })
  | (Node & {
      readonly kind: "AssignmentStatement";
      readonly target: Identifier | MemberExpression;
      readonly value: Expression;
    })
  | (Node & {
      readonly kind: "ReferenceAssignmentStatement";
      readonly target: Expression;
      readonly value: Expression;
    })
  | (Node & {
      readonly kind: "IfStatement";
      readonly condition: Expression;
      readonly thenBranch: BlockStatement;
      readonly elseBranch: BlockStatement | null;
    })
  | (Node & {
      readonly kind: "WhileStatement";
      readonly condition: Expression;
      readonly body: BlockStatement;
    })
  | (Node & {
      readonly kind: "ForStatement";
      readonly variable: Identifier;
      readonly start: Expression;
      readonly end: Expression;
      readonly body: BlockStatement;
    })
  | (Node & { readonly kind: "ReturnStatement"; readonly value: Expression | null })
  | (Node & { readonly kind: "ThrowStatement"; readonly value: Expression })
  | (Node & {
      readonly kind: "TryStatement";
      readonly body: BlockStatement;
      readonly catchName: Identifier;
      readonly catchBody: BlockStatement;
    });

export interface FieldDeclaration extends Node {
  readonly kind: "FieldDeclaration";
  readonly name: Identifier;
  readonly annotation: TypeAnnotation;
}

export interface ClassDeclaration extends Node {
  readonly kind: "ClassDeclaration";
  readonly name: Identifier;
  readonly parent: Identifier | null;
  readonly members: readonly (FieldDeclaration | FunctionDeclaration)[];
}
