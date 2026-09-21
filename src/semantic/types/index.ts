export interface IntType {
  readonly kind: "int";
}
export interface BoolType {
  readonly kind: "bool";
}
export interface StringType {
  readonly kind: "string";
}
export interface VoidType {
  readonly kind: "void";
}
export interface FunctionType {
  readonly kind: "function";
  readonly parameters: readonly Type[];
  result: Type | null;
}
export interface ListType {
  readonly kind: "list";
  readonly element: Type;
}
export interface ReferenceType {
  readonly kind: "reference";
  readonly element: Type;
}
export interface ClassType {
  readonly kind: "class";
  readonly id: number;
  readonly name: string;
  readonly parent: ClassType | null;
  readonly fields: Map<string, Type>;
  readonly methods: Map<string, FunctionType>;
}
export type Type =
  | IntType
  | BoolType
  | StringType
  | VoidType
  | FunctionType
  | ListType
  | ReferenceType
  | ClassType
  | { readonly kind: "builtin"; readonly name: "print" | "map" }
  | { readonly kind: "thrown" };
export const INT: IntType = { kind: "int" };
export const BOOL: BoolType = { kind: "bool" };
export const STRING: StringType = { kind: "string" };
export const VOID_TYPE: VoidType = { kind: "void" };
