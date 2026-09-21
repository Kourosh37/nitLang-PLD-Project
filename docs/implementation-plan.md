# Implementation plan and progress

Milestones 0-25 are complete. The final hidden-case stress suite, documentation
and requirements matrix pass the repository quality checks.

For every milestone: explain semantics/files/decisions before editing; implement;
typecheck and run existing tests; add focused tests; rerun the full suite; fix
failures before proceeding. Record commands, results, limitations and next step.

| Milestone | Deliverable and validation |
| --- | --- |
| 0 (complete) | Strict TS/Bun setup, CLI skeleton, design drafts; CLI unit/process tests |
| 1 (complete) | Final specification/EBNF and SourceSpan; position/span tests |
| 2 (complete) | Lexer; tokens, escapes, malformed source, source positions |
| 3 (complete) | Surface AST/parser/precedence; syntax and associativity tests |
| 4 (complete) | Primitive/variable/block contracts; AST and operation tests, no unchecked execution |
| 5-23 (complete) | Memory, lowering, semantics, full interpreter, VM, extension and formal documents |
| 24 (complete) | README, memory/VM docs, examples, teaching notes, cleanup |
| 25 (complete) | Hidden-case style combinations and final requirements validation matrix |

Lexical/parser fixtures exist in tests/fixtures/valid and tests/fixtures/invalid;
examples/surface-tour.nit is inspectable with ast. Add executable validation when
the relevant pipeline exists. Tests
must never treat example filenames or exact source strings as runtime semantics.

Final matrix columns: requirement, implementation files, tests, example,
documentation section, status. A COMPLETE status requires an actually passing test.
