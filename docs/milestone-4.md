# Milestone 4 report

## Commit and scope

Committed the completed M3 changes first as `0d171cb`:
`feat: implement NITLang surface AST and parser`, with a complete English body.

M4 is complete under the dependency adjustment documented before implementation:
primitive operations and variable/block contracts are provided now; checked source
execution follows M5 storage, M6 Core lowering and M7 static semantics. No Surface
evaluator or direct name-to-value environment was introduced.

## Implemented

- src/runtime/values.ts: immutable tagged int/bool/string values, explicit internal
  void, safe-integer construction and canonical zero.
- src/runtime/primitive-operations.ts: exact bounded arithmetic, truncating division,
  comparisons, equality, unary operators, strict boolean extraction and formatting.
- src/language/operators.ts: shared operator types reused by AST and precedence.
- tests/primitive-operations.test.ts: value and operation boundary/unit tests.
- tests/primitive-source.test.ts: real frontend source feeding individual literal
  operation contracts, diagnostic-span checks and block/binding fixture validation.
- tests/fixtures/valid/primitive-bindings.nit: declarations, nested shadowing and
  outer-variable initializers for subsequent checked execution acceptance tests.
- Primitive semantics and memory-model contract docs, teaching notes, status updates.

## Decisions

Use bigint only for internal exact arithmetic, returning safe-integer int values
after checking bounds. Keep tag-based runtime guards independent from future
static checking. Reject void operands, implicit numeric/string conversion and
host truthiness. Runtime functions accept values, not AST nodes. Operators and/or
are deliberately absent from the eager operation API because lowering must preserve
short-circuit behavior. Print formatting returns text without performing I/O.

Variable/block semantics are specified in memory-model.md. Actual Location,
Environment and Store behavior is intentionally the next milestone's work.

## Validation

| Command | Result |
| --- | --- |
| git add README.md docs src tests examples | Staged the complete M3 delivery |
| git commit with English subject/body | Created 0d171cb |
| bun run check:all after implementation | Strict typecheck and all 188 existing tests passed |
| bun run check:all after new tests | Strict typecheck passed; 258 tests, 0 failures, 1641 assertions |
| git diff --check | Passed for tracked changes, with only Git line-ending conversion warnings |

Seventy new tests cover immutability, primitive tags, safe-integer endpoints,
invalid numeric payloads, canonical zero, signed arithmetic and division,
overflow and zero division, comparison boundaries, string/bool equality, Unicode
identity, every mismatched operand-kind combination, boolean-only conditions,
void rejection, output text, actual parsed literal operations and source spans.
All existing lexer/parser/CLI tests remain passing.

## Limitations and next milestone

There is no interpreter, runtime environment, store, lowering or static checker.
Operation tests are not complete source execution tests. Wrong-kind Runtime
Errors guard the internal operation API; M7 must reject source type mismatches
as Type Errors before execution. The variable fixture currently tests AST
structure, not runtime shadowing or mutation. Its documented output is a future
acceptance requirement, not a claimed passing result. RuntimeValue currently
contains only primitives and void; composite values come in their own milestones.

Next: M5, dedicated Location identity, Store allocation/read/write and lexical
Environment lookup, including fresh cells, shadowing, outer assignment and
invalid-location behavior. Full checked source execution remains scheduled for M7.
