# NITLang architecture

Status: Milestones 0 and 1 are implemented (tooling, CLI skeleton, source locations).
Compiler/runtime modules below are planned contracts.
GROUP_SIZE = 1. Pattern matching is the single planned extension.

```mermaid
flowchart TD
  Source --> Lexer --> Tokens --> Parser --> SurfaceAST
  SurfaceAST --> Desugar --> CoreAST
  CoreAST --> Resolver --> TypeChecker --> CheckedProgram
  CheckedProgram --> Interpreter --> Store
  CheckedProgram --> BytecodeCompiler --> Bytecode --> VM
```

| Directory | Responsibility |
| --- | --- |
| src/cli | Argument validation, file access, diagnostics, exit status |
| src/diagnostics | Structured category/message/span/notes and rendering |
| src/frontend | Source positions, tokens, lexer, recursive descent and Pratt parser |
| src/ast/surface | User syntax, including for, and, or |
| src/ast/core | Independent evaluator syntax, including conditional expressions |
| src/desugar | Pure lowering, generated identifiers, source-span preservation |
| src/semantic/symbols | Static scoped symbols and binding identities |
| src/semantic/types | Explicit tagged types and centralized assignability |
| src/semantic | Resolution, return analysis, type checking |
| src/runtime | Locations, store, environments, values, completions |
| src/interpreter | Core AST execution only |
| src/stdlib | Typed builtin callable definitions for print and map |
| src/bytecode | Typed instructions, chunks, compiler, disassembler |
| src/vm | Operand stack, instruction pointer, scope stack |

AST nodes use discriminated unions and source spans. Surface and Core have
separate program/node types; lowering cannot leave surface-only nodes behind.
Semantic metadata lives in side tables keyed by node/binding identity. Parsing
and checking never evaluate a program. Only a successfully checked program
enters either execution backend. Bytecode compilation rejects unsupported nodes
before running any instructions.

Runtime environments map resolved bindings to Locations, and a Store maps each
Location to a tagged RuntimeValue. Static symbol tables are separate from runtime
environments. Closures retain lexical environments and share captured locations.
Object fields also own store locations; references contain existing locations.
Method dispatch walks the actual object's class chain.

Statement execution produces Normal, Return(value), or Throw(value). Expression
evaluation can propagate Throw. Controlled runtime faults carry diagnostics and
are distinct from catchable language throws. Host bugs are not disguised as
expected language errors.

VM instructions contain data, never host functions. Scope instructions preserve
shadowing. Both engines share primitive operation semantics and value formatting,
but execute independently. Differential tests compare their observable output.

Tests progress from phase units to real source pipelines and cross-backend tests.
No placeholder implementation is considered a passing language feature.

## Source ownership

`SourceFile` owns immutable text and indexes line starts once. `positionAt` uses
binary search; `span` produces immutable endpoints and a source name; `lineText`
provides diagnostic line content without terminators. `SourcePosition` and
`SourceSpan` are data-only interfaces in a separate module, so tokens, ASTs and
diagnostics will not depend on the lexer or filesystem. No newline normalization
is allowed because offsets must continue to index the original source text.
