# NITLang Runbook

This is the operational guide for installing, validating, demonstrating, and
debugging the project. Language behavior is defined in [LANGUAGE.md](LANGUAGE.md).

## Setup

Requirements: Bun 1.3.14 or newer and Git.

```sh
bun install --frozen-lockfile
bun run check:all
```

`check:all` verifies formatting, runs strict TypeScript checking, and executes
the complete test suite. No build or generated source step is required.

## CLI

```sh
bun run nitlang run <file.nit>       # check and interpret
bun run nitlang check <file.nit>     # static checks only
bun run nitlang ast <file.nit>       # print the Surface AST as JSON
bun run nitlang core-ast <file.nit>  # print the lowered Core AST as JSON
bun run nitlang bytecode <file.nit>  # disassemble the VM subset
bun run nitlang vm <file.nit>        # compile and run on the VM
```

Exit code `0` means success, `1` means a source diagnostic, and `2` means a CLI
or file error. Source diagnostics include the category, location, source line,
and caret. Expected failures do not expose a JavaScript stack trace.

## Development

```sh
bun run format
bun run format:check
bun run typecheck
bun test
bun run test:watch
```

Tests are grouped by frontend, semantics, runtime, bytecode, VM, CLI,
differential behavior, resource limits, and runnable examples. Tests under
`tests/fixtures` provide valid and invalid source files.

## Demonstration

Run the short examples in numerical order. Every file is also asserted by
`tests/examples.test.ts`.

```sh
bun run nitlang run examples/01-basics.nit
bun run nitlang run examples/03-functions-closures.nit
bun run nitlang run examples/06-classes.nit
bun run nitlang run examples/09-showcase.nit
```

Show the two execution backends with the VM-compatible example:

```sh
bun run nitlang run examples/02-control-flow.nit
bun run nitlang bytecode examples/02-control-flow.nit
bun run nitlang vm examples/02-control-flow.nit
```

For a presentation, demonstrate `ast`, `core-ast`, and `bytecode` before the
corresponding execution command. This makes parsing, desugaring, compilation,
and execution visible without changing the program.

## Project Map

| Path                         | Responsibility                                  |
| ---------------------------- | ----------------------------------------------- |
| `src/frontend`               | source positions, tokens, lexer, parser         |
| `src/ast`                    | separate Surface and Core trees                 |
| `src/desugar`                | hygienic lowering of `for`, `and`, and `or`     |
| `src/semantic`               | resolution, symbols, types, static checking     |
| `src/runtime`                | values, locations, store, environments, objects |
| `src/interpreter`            | checked Core AST execution                      |
| `src/bytecode`, `src/vm`     | subset compiler, disassembler, stack VM         |
| `src/diagnostics`, `src/cli` | user-facing errors and command boundary         |
| `tests`, `examples`          | automated evidence and runnable programs        |

## Troubleshooting

- Run commands from the repository root so relative example paths resolve.
- Run `bun install --frozen-lockfile` if packages are missing.
- Run `bun run format` when the formatting check fails.
- Put a space between nested type closers and assignment, as in
  `let xs:List<int> = []`; the lexer correctly chooses the longest `>=` token.
- Use semicolons where the next statement could continue the previous
  expression. They are otherwise optional.
- `vm` intentionally rejects features outside its documented subset; use `run`
  for the complete language.
