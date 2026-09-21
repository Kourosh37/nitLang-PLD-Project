# Implementation plan and progress

Milestones 0 and 1 are complete. The user authorized Milestone 1 after committing
Milestone 0. The specification and source-location infrastructure are complete;
language execution is not implemented. Next delivery: Milestone 2, the lexer.

For every milestone: explain semantics/files/decisions before editing; implement;
typecheck and run existing tests; add focused tests; rerun the full suite; fix
failures before proceeding. Record commands, results, limitations and next step.

| Milestone | Deliverable and validation |
| --- | --- |
| 0 (complete) | Strict TS/Bun setup, CLI skeleton, design drafts; CLI unit/process tests |
| 1 (complete) | Final specification/EBNF and SourceSpan; position/span tests |
| 2 | Lexer; tokens, escapes, malformed source, source positions |
| 3 | Surface AST/parser/precedence; syntax and associativity tests |
| 4 | Primitive/variable/block contracts; AST and operation tests, no unchecked execution |
| 5 | Environment/Store/Location; fresh locations, shadowing, mutation |
| 6 | Separate Core AST/desugaring; hygiene, once-only bounds, short circuit structure |
| 7 | Symbol tables/resolver/typechecker; static rejection and checked primitive execution |
| 8 | If/while/assignment; branch typing, loops, short circuit and for integration |
| 9 | Functions/return/recursion; arity, return analysis, factorial |
| 10 | Lambdas/closures; single/multiple captures, shadowing, nested escaping closures |
| 11 | Lists/map; empty/heterogeneous lists, callback typing, ordering |
| 12 | References; aliasing, assignment versus write-through, scope |
| 13 | Classes/objects/this/init; field locations and constructor validation |
| 14 | Inheritance/overrides/subtyping; invalid parents/cycles/signatures |
| 15 | Dynamic dispatch; three levels, inherited field access, bound methods |
| 16 | Throw/try/catch; nested calls/loops, return propagation, uncaught diagnostics |
| 17 | Diagnostic hardening; categories/spans, no expected host traces |
| 18 | Bytecode/compiler/disassembler; stack effects, patched jumps, subset rejection |
| 19 | VM; operand and scope stack, loops, error behavior |
| 20 | Differential tests; same actual source on interpreter and VM |
| 21 | Pattern matching extension; exhaustiveness, types, single evaluation |
| 22 | Formal operational and denotational semantics matching implementation |
| 23 | Hoare assignment and conditional/loop examples with reasoning |
| 24 | README, memory/VM docs, examples, teaching notes, cleanup |
| 25 | Hidden-case style combinations and final requirements validation matrix |

Future fixture directories: tests/fixtures/valid, tests/fixtures/invalid, examples.
Populate them with executable source when the relevant pipeline exists. Tests
must never treat example filenames or exact source strings as runtime semantics.

Final matrix columns: requirement, implementation files, tests, example,
documentation section, status. A COMPLETE status requires an actually passing test.
