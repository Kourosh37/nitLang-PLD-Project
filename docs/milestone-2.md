# Milestone 2 report

## Delivery

Committed all Milestone 1 changes first as `7e22f21`:
`feat: finalize NITLang specification and source locations`.

Implemented:

- src/frontend/token.ts: closed token vocabulary and typed literal variants.
- src/frontend/lexer.ts: hand-written scanner, immutable token stream, EOF,
  comments, escapes, safe integers, longest match and first-error result API.
- src/diagnostics/diagnostic.ts: shared structured diagnostic categories, controlled
  internal unwinding and readable source-location formatting.
- Sixty new tests across lexer, diagnostics and fixture suites, plus four .nit
  fixtures containing valid lexical combinations and invalid lexical cases.
- Lexer architecture/API/teaching documentation and updated project status.

## Decisions

Introduce the diagnostic foundation now because lexical failures require it;
M17 still owns cross-phase hardening. Stop on the first error and return no partial
tokens. Keep keyword matching and runtime property lookup separate using Maps.
Preserve raw lexemes alongside decoded literals. Lexing does not execute source,
balance syntax or perform static type checking. Existing CLI commands do not
claim to run phases that are not implemented.

## Commands and results

| Command | Result |
| --- | --- |
| git add README.md docs src tests | Staged the completed M1 delivery |
| git commit with English subject/body | Created 7e22f21 |
| bun run check:all after lexer implementation | Strict typecheck and 30 existing tests passed |
| bun run check:all after new tests | Found two test expectation typing errors; corrected explicit string-array comparisons without relaxing compiler settings |
| bun run check:all after correction | Passed: 90 tests, 0 failures, 583 assertions; strict typecheck passed |

Coverage includes all keywords/punctuation, keyword prefixes and host-property
names, operator adjacency, signs, leading zeros, integer overflow, malformed
numeric suffixes, valid/invalid escapes, raw newlines, unterminated strings and
comments, non-nested comments, Unicode content/invalid identifiers, surrogate
pairs, BOM placement, exact spans, EOF, token immutability, repeated calls,
diagnostic rendering, and real source fixtures. All prior tests still pass.

## Limitations and next step

Only source-to-token execution is available; parser, semantic checker and runtime
are unimplemented. Decimal expressions are rejected by the future parser, not
by the lexer (integer/dot/integer are valid individual tokens). Diagnostics stop
at the first lexical error and do not yet include source snippets or recovery.
The match keyword is reserved; the extension is not implemented.

Next: Milestone 3, Surface AST, recursive descent declaration/statement parser
and precedence-based expression parser, using the token and diagnostic contracts.
