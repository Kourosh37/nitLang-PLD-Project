# NITLang

An educational programming language implemented incrementally in strict TypeScript
using Bun. The target is a statically checked tree-walk interpreter plus a stack
VM for a smaller subset, with explicit lexical environments and store locations.

**Current status: Milestone 1.** Project tooling, a tested CLI skeleton, finalized
language specification and immutable source locations are available.
Lexer, parser, checker, interpreter and VM are not implemented yet.
Language examples below illustrate the specification; they cannot run yet.

## Requirements and setup

Install Bun 1.3.14 or newer, then from the repository root:

```sh
bun install --frozen-lockfile
bun run check:all
bun run nitlang --help
```

TypeScript and Bun type definitions are development-only dependencies. There
are no runtime packages, frameworks, or language-engine dependencies.

## Commands

```sh
bun run typecheck
bun test
bun run test
bun run test:watch
bun run check:all
```

The CLI reserves these commands for subsequent milestones:

```sh
bun run nitlang run file.nit
bun run nitlang check file.nit
bun run nitlang ast file.nit
bun run nitlang core-ast file.nit
bun run nitlang bytecode file.nit
bun run nitlang vm file.nit
```

Currently each reserved command reports that it is unimplemented and exits with
status 2. Help exits 0. Invalid invocations also exit 2. No source file is executed.

## Planned language

```text
func makeAdder(x:int) = {
    return lambda (y:int) -> x + y
}
let addFive = makeAdder(5)
print(addFive(3))
```

Pipeline: source -> lexer -> parser -> Surface AST -> desugaring -> Core AST ->
resolver/typechecker -> interpreter, or bytecode compiler -> VM. Static checking
precedes execution. Planned VM support covers primitives, bindings, assignments,
print, conditions and loops. Pattern matching is the extension for GROUP_SIZE = 1.

## Repository

```text
src/cli/       CLI interface and Bun entry point
src/frontend/  SourcePosition, SourceSpan and indexed SourceFile
tests/         Source-location, CLI unit and actual process tests
docs/          Language specification, architecture and milestone reports
```

Read the [language specification](docs/language-spec.md),
[complete EBNF](docs/grammar.md), [architecture](docs/architecture.md),
[design decisions](docs/design-decisions.md), and
[implementation plan](docs/implementation-plan.md), plus the implemented
[source-location contract](docs/source-locations.md).

Future stages add source fixtures, examples, runtime/memory documentation, VM
instructions, formal semantics, Hoare reasoning and a verified requirements matrix.
Next: Milestone 2, the hand-written lexer with source spans and lexical diagnostics.
