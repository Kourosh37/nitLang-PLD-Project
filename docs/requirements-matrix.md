# Requirements validation matrix

Status reflects the repository after Milestone 25. COMPLETE means a passing test
exercises the implementation; documentation alone is never counted as completion.
Section numbers correspond to the original assignment prompt.

| Requirement | Implementation files | Tests | Example/documentation | Status |
| --- | --- | --- | --- | --- |
| 0 pipeline | pipeline.ts, frontend, desugar, semantic, interpreter | execution, stress | architecture.md | COMPLETE |
| 1 TypeScript/Bun/engineering | tsconfig.json, package.json, modular src | check:all | README | COMPLETE |
| 2 incremental workflow | milestone reports, git history | full suite each milestone | implementation-plan.md | COMPLETE |
| 3 specification first | docs language/grammar/architecture/decisions | parser/lexer suites | four required docs | COMPLETE |
| 4 primitives | values.ts, checker | primitive/execution | primitive-semantics.md | COMPLETE |
| 5 operators | primitive-operations.ts, precedence.ts | primitive/parser | language-spec.md | COMPLETE |
| 6 variables/bindings | resolver, Environment/Store, interpreter | execution/stress | primitive-bindings.nit | COMPLETE |
| 7 memory model | location.ts, environment.ts, store.ts | memory | memory-model.md | COMPLETE |
| 8 control flow | checker/interpreter | execution/differential | loop.nit | COMPLETE |
| 9 functions/recursion | closure.ts, checker/interpreter | execution | full-language.nit | COMPLETE |
| 10 return types | type-checker.ts | execution invalid/valid functions | language-spec.md | COMPLETE |
| 11 lambdas | core/surface AST, checker/interpreter | execution | surface-tour.nit | COMPLETE |
| 12 closures | closure.ts, Environment/Store | execution/stress | full-language.nit | COMPLETE |
| 13 lists | values.ts, checker/interpreter | execution | full-language.nit | COMPLETE |
| 14 map | checker/interpreter builtin paths | execution | full-language.nit | COMPLETE |
| 15 references | ReferenceValue, checker/interpreter | execution | surface-tour.nit | COMPLETE |
| 16 separate ASTs | ast/surface, ast/core | desugar/parser | architecture.md | COMPLETE |
| 17 desugaring | desugar.ts | desugar/differential | core-ast CLI | COMPLETE |
| 18 static types | semantic/types, checker, assignability | execution invalid cases | language-spec.md | COMPLETE |
| 19 name resolution | resolver, SymbolTable | execution/stress | architecture.md | COMPLETE |
| 20 OOP | class.ts, checker/interpreter | execution | full-language.nit | COMPLETE |
| 21 initializer | class construction path, UNINITIALIZED | execution | memory-model.md | COMPLETE |
| 22 inheritance | checker/runtime class chain | execution | full-language.nit | COMPLETE |
| 23 subtyping | assignability.ts | execution | full-language.nit | COMPLETE |
| 24 dynamic dispatch | Interpreter.method, BoundMethodValue | execution/stress | milestone-15.md | COMPLETE |
| 25 exceptions | completion.ts, checker/interpreter/pipeline | execution/stress | full-language.nit | COMPLETE |
| 26 eager evaluation | interpreter call/binary order | execution/map tests | formal-semantics.md | COMPLETE |
| 27 errors/diagnostics | diagnostic.ts and phase boundaries | diagnostic/CLI/stress | milestone-17.md | COMPLETE |
| 28 source locations | source-file.ts, source-span.ts | source-file/lexer/parser | source-locations.md | COMPLETE |
| 29 tree interpreter | interpreter.ts | execution/stress | full-language.nit | COMPLETE |
| 30 bytecode VM | bytecode, vm | bytecode/vm | vm.md | COMPLETE |
| 31 compiler/disassembler | compiler.ts, chunk.ts | bytecode/CLI | loop.nit | COMPLETE |
| 32 differential tests | independent run/runVm paths | differential/stress | loop.nit | COMPLETE |
| 33 extension | match AST/parser/checker/interpreter | parser/execution | milestone-21.md | COMPLETE |
| 34 test strategy | tests/*.test.ts | `bun test` | milestone reports | COMPLETE |
| 35 fixtures | tests/fixtures, examples | fixture/process suites | README | COMPLETE |
| 36 hidden-case resilience | generic phases, no input matching | stress.test.ts | full-language.nit | COMPLETE |
| 37 CLI | cli.ts/main.ts | cli unit/process | README | COMPLETE |
| 38 scripts | package.json | check:all execution | README | COMPLETE |
| 39 directory structure | src module directories | typecheck/import tests | README | COMPLETE |
| 40 formal semantics | formal-semantics.md | formal-examples | formal-semantics.md | COMPLETE |
| 41 Hoare logic | hoare-logic.md | hoare-examples | hoare-logic.md | COMPLETE |
| 42 design docs | docs/*.md | documentation examples | architecture/vm/memory docs | COMPLETE |
| 43 README | README.md | CLI commands exercised | README | COMPLETE |
| 44 deliverables | source/tests/examples/docs | full suite | repository | COMPLETE |
| 45 milestone order | commits and milestone-0..25 | per-commit checks | implementation-plan.md | COMPLETE |
| 46 invariants | phase modules and location runtime | desugar/memory/execution | architecture.md | COMPLETE |
| 47 quality checks | check:all script | typecheck + full tests | milestone reports | COMPLETE |
| 48 refactoring | shared operators/operations, separate phases | regression suite | design-decisions.md | COMPLETE |
| 49 teaching explanations | milestone and subsystem docs | examples tied to tests | docs | COMPLETE |
| 50 validation matrix | this file | referenced passing suites | this file | COMPLETE |
| 51 final stress | stress.test.ts | combined cases | full-language.nit | COMPLETE |
| 52 incremental response behavior | commit history/milestone reports | milestone validation | milestone-0..25 | COMPLETE |

Known limitations are listed in README. They are deliberate exclusions outside
the stated base syntax/VM subset and do not mark a required feature incomplete.
