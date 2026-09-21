# Milestone 0 report

## Delivered

- Inspected the repository: only .git existed; there were no existing tests or source files.
- Created language, complete EBNF, architecture and design-decision drafts before implementation.
- Recorded all 26 milestones and the dependency adjustment for early execution work.
- Set up Bun scripts, pinned development dependencies, lockfile and strict TypeScript.
- Implemented an injectable CLI interface and a thin actual Bun process entry point.
- Added README installation/usage/status information and ignored generated artifacts.

## Decisions

The CLI interface receives output callbacks so validation can be tested without
mutating global process state. The process entry point alone sets exit status.
Reserved commands fail explicitly instead of claiming to check or execute source.
The future pipeline has separate Surface/Core ASTs, resolution/checking, store-based
runtime and independent bytecode execution. GROUP_SIZE = 1.

## Commands and results

| Command | Result |
| --- | --- |
| bun --version | 1.3.14 |
| bun install | Initial sandbox network refusal; approved retry installed 5 packages and wrote bun.lock |
| bun run typecheck | Passed before adding tests |
| bun test | Initial baseline: no tests found in the empty repository; resolved by adding tests |
| bun run check:all | Passed: strict typecheck and 19 tests, 0 failures, 118 assertions |
| bun run nitlang --help | Passed: command descriptions and explicit Milestone 0 status |
| git diff --check | Passed; files were untracked, so this is not a complete whitespace audit |

Tests cover no-argument/help invocation, all six reserved commands, missing/empty/
extra arguments, unknown commands, filenames containing spaces, and three actual
CLI process invocations. These validate infrastructure, not language semantics.

## Limitations and next milestone

No language source is parsed, checked or executed. SourceSpan and all compiler/
runtime components remain unimplemented. Documentation describes the planned
contract, including deferred extension syntax; it does not claim completed features.

Milestone 1 will finalize the specification/grammar and implement/test source
positions and spans. Stop here until the user's next instruction, as requested.
