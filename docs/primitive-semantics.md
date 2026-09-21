# Primitive values and operations

Implemented in Milestone 4 as reusable runtime operations. Later milestones use
them from both the checked tree interpreter and stack VM.

## Values

`src/runtime/values.ts` defines IntValue, BoolValue, StringValue and VoidValue as
readonly tagged objects. PrimitiveValue is the first three; RuntimeValue also
includes void, closures, lists, references, classes, objects and bound methods.
These are runtime representations, distinct from Surface type annotations and
semantic types. Factories freeze values; VOID is an explicit singleton with no
host undefined payload. Bool factories reuse immutable true/false values.

All ordinary language values must be constructed through these factories.
Int payloads are finite safe integers from -9007199254740991 through
9007199254740991 inclusive. intValue rejects invalid numeric payloads with a
located Runtime Error and normalizes -0 to 0. Internal TypeScript consumers must
not forge value objects; the APIs are not an untyped host-data import boundary.

## Operator contract

`src/language/operators.ts` holds shared operator types. Surface AST and parser
precedence reuse them without forcing the runtime to depend on Surface AST.
`src/runtime/primitive-operations.ts` is independent of parsing and storage.

| Operation | Accepted values | Result/failure |
| --- | --- | --- |
| +, -, *, / | Two ints | Int; overflow and zero division are Runtime Errors |
| <, >, <=, >= | Two ints | Bool |
| ==, != | Two ints, two bools or two strings | Bool, strict value equality |
| Unary - | Int | Int, with canonical zero |
| not | Bool | Bool |
| requireBoolean | Bool | Host boolean for a checked branch decision |
| formatPrimitive | Int, bool or string | Text without an added newline |

Each operation accepts an originating SourceSpan for a DiagnosticError. Wrong
operand kinds are defensive Runtime Errors at this low-level boundary. M7 must
reject those source expressions statically with Type Errors before execution;
runtime guards do not stand in for the checker. Void cannot participate in these
operations, comparisons, conditions or printing. Objects compare by identity.

Arithmetic uses bigint intermediates to implement exact integer operations.
Check the result against the int bounds before converting to a number. This
avoids depending on intermediate host floating-point rounding. BigInt is an
implementation technique only: NITLang has no bigint type or bigint literals.
Division truncates toward zero (`-7 / 3` gives -2). Bounds are symmetric, so
negating MIN_INT is valid. Division by zero is checked before host division.

Equality checks compatible tags before strict comparison; strings compare their
exact stored Unicode code-unit sequences without normalization. No string
concatenation, truthiness, loose equality or numeric conversion is exposed as
language semantics. `formatPrimitive` formats decimal ints, lowercase booleans
and raw strings; the print builtin owns the trailing output newline.

## Evaluation boundary

Operations accept values that an execution backend has already evaluated. They do
not traverse ASTs, resolve names, allocate locations or evaluate callbacks.
Left-to-right operand evaluation remains the execution backend's responsibility.
There are deliberately no eager and/or operations: M6 lowers them to conditional
Core expressions so the second operand need not execute. The interpreter and VM
reuse these primitive semantics while implementing independent control
flow. Short-circuit execution is not tested or claimed yet.

## Variables and blocks

Their M4 deliverable is the contract in [memory-model.md](memory-model.md) and
source fixtures preserving declaration order, initializer expressions and nested
block structure. M5 implements locations/store/environments; M7 adds resolution,
type checking and checked primitive execution after M6 lowering. The parsed
fixture is not evidence that variable execution is implemented.

## Testing and teaching

Unit tests cover arithmetic, boundaries, negative quotients, overflow, zero
division, invalid int payloads, all operand-kind pairings, equality, conditions,
immutable values, formatting and diagnostic spans. Source contract tests run real
text through lexer/parser, convert only direct literal nodes, and invoke one
primitive operation. This adapter is not a recursive Surface evaluator or a
complete static-check/execution pipeline. Full program tests follow M7.

Professor question: Why use tags instead of raw JavaScript values? Answer: a tag
lets runtime code discriminate language values explicitly and extend the union
with closures and objects. It prevents accidentally using host coercion to define
operators. The checker later rejects bad types before execution; runtime guards
protect the backend contract rather than implementing static typing.

Professor question: Why not execute blocks now with a Map of names to values?
Answer: references and closures need stable locations. A temporary direct-value
environment would violate that invariant and need replacement. We first specify
the behavior, then implement the required memory model in M5.
