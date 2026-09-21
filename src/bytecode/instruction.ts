import type { SourceSpan } from "../frontend/source-span";
import type { PrimitiveBinaryOperator, UnaryOperator } from "../language/operators";
import type { PrimitiveValue } from "../runtime/values";
export type Instruction =
  | { readonly op: "CONST"; readonly value: PrimitiveValue; readonly span: SourceSpan }
  | {
      readonly op: "DEFINE" | "LOAD" | "STORE";
      readonly binding: number;
      readonly span: SourceSpan;
    }
  | { readonly op: "UNARY"; readonly operator: UnaryOperator; readonly span: SourceSpan }
  | { readonly op: "BINARY"; readonly operator: PrimitiveBinaryOperator; readonly span: SourceSpan }
  | { readonly op: "JUMP" | "JUMP_IF_FALSE"; target: number; readonly span: SourceSpan }
  | {
      readonly op: "ENTER_SCOPE" | "EXIT_SCOPE" | "POP" | "PRINT" | "HALT";
      readonly span: SourceSpan;
    };
