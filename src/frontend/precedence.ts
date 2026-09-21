import type { BinaryOperator } from "../language/operators";

export const binaryPrecedence: Readonly<Record<BinaryOperator, number>> = Object.freeze({
  or: 1, and: 2,
  "==": 3, "!=": 3,
  "<": 4, ">": 4, "<=": 4, ">=": 4,
  "+": 5, "-": 5,
  "*": 6, "/": 6,
});

export function isBinaryOperator(kind: string): kind is BinaryOperator {
  return Object.hasOwn(binaryPrecedence, kind);
}
