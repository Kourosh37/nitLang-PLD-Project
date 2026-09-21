import type { BlockStatement, Expression, Parameter } from "../ast/core";
import type { Environment } from "./environment";
export interface ClosureValue {
  readonly kind: "closure";
  readonly parameters: readonly Parameter[];
  readonly body: BlockStatement | Expression;
  readonly environment: Environment;
}
