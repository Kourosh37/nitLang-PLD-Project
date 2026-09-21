# Milestone 3 report

## Commit and scope

Committed the entire completed M2 delivery first as `135b7b7`:
`feat: implement NITLang lexer and lexical diagnostics`, with an English body
describing the implementation, fixtures, tests and documentation.

This delivery completes M3, not M4. It recognizes all mandatory syntax but does
not implement its static or runtime semantics. Match remains reserved until M21.

## Implemented

- src/ast/surface/index.ts: separate readonly Surface AST unions for declarations,
  statements, expressions, names, parameters and unresolved type annotations.
- src/frontend/precedence.ts: one explicit binary precedence table.
- src/frontend/parser.ts: recursive descent statements/declarations, precedence
  climbing expressions, source/token APIs and controlled syntax diagnostics.
- src/cli: working ast command with injected file access and distinct source/I/O
  failure statuses; existing unavailable commands remain explicit.
- examples/surface-tour.nit: combined functions, closures, lists, references,
  objects, inheritance, control flow and exceptions for AST inspection.
- Parser/fixture/CLI tests, two invalid source fixtures, API and teaching docs.

## Architectural decisions

Parser never resolves identifiers, checks types or executes code. Surface sugar
remains available for later lowering into a separately defined Core AST. Type
annotations retain syntax without pretending to be semantic types. Every node
has an original-source span. Optional constructs use null; child order is stable.

Binary operators associate left via a right-side precedence threshold of p+1.
Unary operators associate right; calls/member access chain iteratively. Greedy
lambda and newline behavior match the specification. Ordinary assignment checks
its target's syntactic shape; reference assignment defers type compatibility.

Parsing stops at its first error and never returns a partial AST. A shared
128-active-frame recursion bound converts excessive syntactic nesting into a
located diagnostic. Long flat chains are parsed iteratively. Token API misuse is
a programmer error, separate from an invalid NITLang source program.

## Validation

| Command | Result |
| --- | --- |
| git add README.md docs src tests | Staged M2 changes |
| git commit with English subject/body | Created 135b7b7 |
| bun run check:all after initial parser | Strict TypeScript and all 90 existing tests passed |
| bun run check:all after CLI integration | Passed: 92 tests |
| bun run check:all after parser tests | Strict checking caught an unnarrowed LexResult comparison in a test; narrowed its failure branch without weakening types |
| bun run check:all, final | Passed: strict typecheck; 188 tests, 0 failures, 846 assertions |
| bun run nitlang ast examples/surface-tour.nit | Exit 0, emitted real Program JSON with source spans; no NITLang execution |
| git diff --check | Passed for tracked changes, with only Git line-ending conversion warnings |

The suite grew from 90 to 188 tests. Coverage includes each binary operator's
association, adjacent precedence levels, unary/postfix chains, nested lambdas,
grouping, all mandatory declaration/statement forms, nested List/Ref/Fn types,
assignment targets, semicolon/newline behavior, malformed syntax, deferred match,
exact token/EOF diagnostics and AST spans, lexical-error propagation, independent
parser calls, nesting limits, a 2,000-term chain, real .nit files, and actual CLI
success/source-error/missing-file processes. CLI tests also verify JSON output
does not contain output from the source program's print calls.

## Remaining limitations and next milestone

An AST success proves syntactic validity only. Undefined names, duplicate bindings,
bad return/this contexts, incompatible types and inheritance validity await
semantic analysis. No Core AST, desugaring, runtime, VM or match extension exists.
Syntax recovery and multiple-diagnostic reporting are not implemented. Very large
AST output still depends on host JSON serialization and memory limits.

Next is M4: primitive expression, variable and block contracts with focused
operation tests. As documented in the original dependency adjustment, public
checked execution will wait for Environment/Store/Location (M5), lowering (M6)
and static checking (M7). This avoids a temporary unchecked Surface evaluator.
