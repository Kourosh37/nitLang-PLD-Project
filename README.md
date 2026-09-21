# NITLang

An educational programming language implemented incrementally in strict TypeScript
using Bun. The target is a statically checked tree-walk interpreter plus a stack
VM for a smaller subset, with explicit lexical environments and store locations.

**Current status: Milestone 3.** Source text can be lexed and parsed into a typed
Surface AST with source locations and structured syntax diagnostics. The `ast`
CLI command is operational. Checker, desugaring, interpreter and VM are not yet
implemented; examples can be inspected as ASTs but cannot execute yet.

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

Inspect the included combined-feature example:

```sh
bun run nitlang ast examples/surface-tour.nit
```

The CLI command set is:

```sh
bun run nitlang run file.nit
bun run nitlang check file.nit
bun run nitlang ast file.nit
bun run nitlang core-ast file.nit
bun run nitlang bytecode file.nit
bun run nitlang vm file.nit
```

`ast` emits JSON and exits 0, or reports a lexical/parser diagnostic and exits 1.
File-read and invocation errors exit 2. Other commands remain unavailable and
exit 2. Help exits 0. No source file is executed or statically typechecked yet.

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
src/frontend/  Source positions, lexer, tokens, parser and precedence table
src/ast/surface/ Typed syntax tree and annotation nodes
src/diagnostics/ Structured diagnostics and text formatting
tests/         Frontend, diagnostics, source locations, CLI and .nit fixtures
examples/      Programs inspectable through the ast command
docs/          Language specification, architecture and milestone reports
```

Read the [language specification](docs/language-spec.md),
[complete EBNF](docs/grammar.md), [architecture](docs/architecture.md),
[design decisions](docs/design-decisions.md), and
[implementation plan](docs/implementation-plan.md), plus the implemented
[source-location contract](docs/source-locations.md), [lexer API](docs/lexer.md)
and [parser/AST design](docs/parser.md).

Future stages add executable fixtures/examples, runtime/memory documentation, VM
instructions, formal semantics, Hoare reasoning and a verified requirements matrix.
Next: Milestone 4, primitive/variable/block contracts and operation tests; checked
execution follows the storage, lowering and semantic infrastructure in M5-M7.
