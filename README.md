# NITLang

NITLang is an educational, statically checked programming language implemented
in strict TypeScript with Bun. It includes a hand-written frontend, separate
Surface/Core ASTs, lexical scope resolution, a store-based tree interpreter and
a stack VM for the required primitive/control-flow subset.

## Requirements and setup

- Bun 1.3.14 or newer
- No runtime dependencies or generated compiler tools

```sh
bun install --frozen-lockfile
bun run check:all
```

## CLI

```sh
bun run nitlang run examples/surface-tour.nit
bun run nitlang check examples/surface-tour.nit
bun run nitlang ast examples/surface-tour.nit
bun run nitlang core-ast examples/loop.nit
bun run nitlang bytecode examples/loop.nit
bun run nitlang vm examples/loop.nit
```

`run` performs the complete frontend, static checking and tree interpretation.
`check` stops after static checking. `ast` and `core-ast` print JSON. `bytecode`
disassembles the supported subset; `vm` compiles and executes it. Source errors
exit 1, while CLI/I/O errors exit 2. Expected errors include source context and
never intentionally expose a host stack trace.

## Language example

```nitlang
func makeAdder(x:int) = {
    return lambda (y:int) -> x + y
}

class Animal {
    func speak():string = { return "..." }
}
class Dog extends Animal {
    func speak():string = { return "Woof" }
}

let addFive = makeAdder(5)
let animal:Animal = new Dog()
print(addFive(3))
print(animal.speak())
print(map(lambda (x:int) -> x * 2, [1, 2, 3]))
```

The language supports int/bool/string, mutable lexical variables, blocks,
assignment, if/while/for, functions, recursion, lambdas and closures, homogeneous
lists and map, explicit references, classes/objects, single inheritance, dynamic
dispatch, throw/try/catch, and exhaustive primitive pattern matching. Integers
are checked safe integers; operations never use JavaScript coercion or truthiness.

## Architecture

```text
source -> lexer -> parser -> Surface AST -> desugaring -> Core AST
       -> resolver -> type checker -> checked program -> tree interpreter
                                               \-----> bytecode compiler -> VM
```

Runtime Environment maps resolved binding IDs to Location objects. Store maps
Locations to tagged RuntimeValues. Closures retain Environments, references retain
Locations and object fields own Locations. Static SymbolTable is separate. Surface
`for` and `and/or` disappear during lowering. Both execution backends reuse only
the specified primitive operations; differential tests compare their output.

## Development

```sh
bun run typecheck
bun test
bun run test:watch
bun run check:all
```

Important integration tests execute actual `.nit` text through the real pipeline.
Fixtures live under `tests/fixtures`; runnable examples live under `examples`.

## Repository layout

```text
src/frontend/       source locations, tokens, lexer, parser, precedence
src/ast/            separate Surface and Core AST definitions
src/desugar/        hygienic Surface-to-Core lowering
src/semantic/       symbol tables, resolver, types, assignability, checker
src/runtime/        values, Location, Store, Environment, closures, objects
src/interpreter/    checked Core tree interpreter
src/bytecode/       instruction model, compiler and disassembler
src/vm/             stack virtual machine
src/diagnostics/    structured errors and source rendering
src/cli/            command interface and process boundary
tests/              unit, integration, fixture and differential tests
docs/               specification, reports and formal material
examples/           NITLang programs
```

## Documentation

- [Language specification](docs/language-spec.md) and [EBNF](docs/grammar.md)
- [Architecture](docs/architecture.md) and [design decisions](docs/design-decisions.md)
- [Memory model](docs/memory-model.md), [parser](docs/parser.md), [lexer](docs/lexer.md)
- [VM instruction set](docs/vm.md)
- [Formal semantics](docs/formal-semantics.md) and [Hoare logic](docs/hoare-logic.md)
- [Implementation plan](docs/implementation-plan.md) and milestone reports

## Known limitations

- The VM intentionally excludes functions, closures, lists, references, classes,
  exceptions and pattern matching; it rejects these before execution.
- Base syntax has no indexing, list mutation, break/continue, super or finally.
- Source diagnostics stop at the first error; there is no recovery batch.
- Runtime calls and syntactic nesting have documented limits of 128.
- The Store retains allocated cells until a run ends; no explicit garbage collector.
- Polymorphic builtins `print` and `map` may be called directly but not stored.

`GROUP_SIZE = 1`; pattern matching is the completed advanced extension.
