export type BinaryOperator =
  "or" | "and" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "+" | "-" | "*" | "/";
export type PrimitiveBinaryOperator = Exclude<BinaryOperator, "and" | "or">;
export type UnaryOperator = "-" | "not";
