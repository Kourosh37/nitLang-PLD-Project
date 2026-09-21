import type { FunctionDeclaration } from "../ast/core";
import type { Environment } from "./environment";
import type { Location } from "./location";
export interface ClassValue {
  readonly kind: "class"; readonly name: string; readonly fields: readonly string[];
  readonly methods: ReadonlyMap<string, FunctionDeclaration>; readonly environment: Environment;
  readonly parent: ClassValue | null;
}
export interface ObjectValue { readonly kind: "object"; readonly classValue: ClassValue; readonly fields: ReadonlyMap<string, Location> }
export interface BoundMethodValue { readonly kind: "bound-method"; readonly method: FunctionDeclaration; readonly receiver: ObjectValue; readonly environment: Environment }
