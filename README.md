# NITLang

NITLang is a small, statically checked teaching language implemented in strict
TypeScript. It has a hand-written lexer and parser, Surface and Core ASTs, a
resolver, a type checker, a store-based interpreter, and a stack VM for the
primitive control-flow subset.

```sh
bun install --frozen-lockfile
bun run check:all
bun run nitlang run examples/09-showcase.nit
```

The examples cover every implemented language feature and are executed by the
test suite. Start with `01-basics.nit` and finish with `09-showcase.nit`.

## Documentation

- [Runbook](docs/RUNBOOK.md): setup, commands, tests, demos, and troubleshooting
- [Language rules](docs/LANGUAGE.md): syntax, types, semantics, and VM limits
- [Project checklist](docs/PROJECT-CHECKLIST.md): PDF requirements mapped to code and tests

## Pipeline

```text
source -> lexer -> parser -> Surface AST -> desugar -> Core AST
       -> resolver -> type checker -> interpreter
                               \----> bytecode compiler -> VM
```

NITLang uses Bun 1.3.14 or newer. It has no runtime dependencies.
