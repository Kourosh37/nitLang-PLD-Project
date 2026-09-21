# Milestone 1 report

## Scope and delivered work

Milestone 0 was committed first as `04b5a80`, with the English subject
`chore: bootstrap NITLang milestone 0` and a descriptive English commit body.
The subsequent work completes Milestone 1 only; lexer implementation is deferred.

- Finalized language specification v1 and the complete EBNF, including explicit
  lexical terminals, punctuation inventory and deferred match grammar.
- Clarified line endings, whitespace/BOM, malformed numbers, scope initialization,
  declaration mutability, method inference cycles and conservative return analysis.
- Resolved negative match-arm ambiguity using the existing greedy expression rule
  and an explicit semicolon where required.
- Implemented readonly SourcePosition/SourceSpan interfaces and immutable SourceFile.
- Added source indexing, validated position/span lookup and line extraction.
- Updated README, architecture, plan and CLI status wording for the new milestone.
- Added source-location documentation with complexity, semantics and professor Q&A.

## Architecture and semantics

SourceFile indexes original UTF-16 text, preserving CR/LF/CRLF rather than
normalizing it. Offsets are zero-based, line/column one-based, spans half-open.
The line index is built once in O(n); positions use binary search. Source names
are independent of filesystem I/O. Locations are data that future tokens and AST
nodes can retain without depending on a lexer or runtime. No source is executed.

## Validation

| Command | Result |
| --- | --- |
| bun run check:all, before new tests | Passed: typecheck and all 19 existing tests |
| bun run check:all, first expanded suite | Strict checking caught an imprecise test array type; fixed using readonly tuples without weakening compiler options |
| bun run check:all, final | Passed: typecheck, 30 tests, 0 failures, 211 assertions |
| git diff --check | Passed for tracked changes; Git reported only LF/CRLF conversion warnings |

Eleven new tests cover empty input/EOF, every offset across mixed terminators,
consecutive LF/CR/CRLF lines, tabs/BOM/Persian text/surrogate pairs, a 10,001-line
source with nonsequential queries, source slicing across spans, immutability,
invalid offsets, reversed spans and invalid one-based line numbers. Existing CLI
process tests still verify real entry-point behavior and exit codes.

## Remaining limitations and next step

Source locations are implemented, but tokens, lexer, parser, diagnostics pipeline,
semantic checking and execution are not. The finalized specification describes
the target language; it is not evidence of passing language integration tests.
Malformed SourceFile API arguments throw programmer-facing RangeErrors; actual
NITLang diagnostics will be introduced with frontend implementation.

Next milestone: M2, hand-written lexer, span-bearing tokens, controlled lexical
diagnostics and tests for valid/invalid source. No M2 implementation is included.
