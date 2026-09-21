# NITLang Project Requirements Checklist

This document maps the implementation requirements in `project.pdf` to concrete
source files, implementation details, tests, and runnable examples. Page numbers
refer to the 16-page assignment PDF.

## Implementation Status

- [x] Every mandatory language feature is implemented by the tree-walk interpreter.
- [x] The required bytecode and virtual-machine subset is implemented.
- [x] Static checking always runs before program execution.
- [x] Syntax, type, and runtime failures are reported as controlled diagnostics.
- [x] Two advanced extensions are implemented: type inference and pattern matching.
- [x] Valid, invalid, boundary, integration, differential, and CLI tests are included.
- [x] Runnable examples cover every implemented feature family.

## 1. Source Pipeline and Front End

### Requirement: Read and execute a NITLang source file

**PDF:** Pages 2-3

**Where:**

- `src/cli/main.ts`
- `src/cli/cli.ts`
- `src/pipeline.ts`

**How:** The CLI reads a `.nit` file and exposes `run`, `check`, `ast`,
`core-ast`, `bytecode`, and `vm` commands. The pipeline coordinates parsing,
desugaring, name resolution, static checking, interpretation, bytecode
compilation, and VM execution. A program cannot reach either backend until it
has passed static checking.

**Evidence:** `tests/cli.test.ts` and `tests/cli-process.test.ts` execute both the
CLI API and the real child process, including success output and exit codes.

### Requirement: Lexer, parser, and AST

**PDF:** Pages 2-4

**Where:**

- `src/frontend/lexer.ts`
- `src/frontend/parser.ts`
- `src/frontend/precedence.ts`
- `src/frontend/source-file.ts`
- `src/ast/surface/index.ts`
- `src/ast/core/index.ts`

**How:** A hand-written lexer produces immutable tokens with source spans. A
precedence-aware recursive-descent parser produces a Surface AST. Surface and
Core syntax use separate AST types so lowering is an explicit compiler phase.

**Evidence:** `tests/lexer.test.ts`, `tests/parser.test.ts`,
`tests/source-file.test.ts`, and the valid/invalid files under `tests/fixtures`.

## 2. Primitive Language Features

### Requirement: `int`, `bool`, and `string`

**PDF:** Page 3

**Where:**

- `src/semantic/types/index.ts`
- `src/runtime/values.ts`
- `src/semantic/type-checker.ts`

**How:** Static and runtime values use tagged representations. The type checker
rejects incompatible operations without relying on JavaScript coercion.

**Evidence:** `tests/primitive-operations.test.ts` and
`examples/01-basics.nit`.

### Requirement: Arithmetic, comparison, equality, and Boolean expressions

**PDF:** Pages 4 and 9

**Where:**

- `src/language/operators.ts`
- `src/frontend/precedence.ts`
- `src/runtime/primitive-operations.ts`
- `src/semantic/type-checker.ts`

**How:** The implementation supports `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`,
`<=`, `>=`, `not`, `and`, and `or`. Precedence is fixed in the parser. Integer
operations accept only safe integers. Division by zero and overflow produce
controlled runtime diagnostics.

**Evidence:** `tests/primitive-operations.test.ts`, `tests/parser.test.ts`, and
`tests/execution.test.ts` cover valid operations, precedence, invalid operand
types, limits, overflow, and zero division.

### Requirement: Variables and assignment

**PDF:** Pages 4 and 9

**Where:**

- `src/semantic/resolver.ts`
- `src/semantic/type-checker.ts`
- `src/interpreter/interpreter.ts`

**How:** `let` creates a mutable binding with an inferred or declared type.
Assignments resolve to a binding or object field and are checked for type
compatibility. Undefined identifiers and same-scope duplicate declarations are
reported before execution.

**Evidence:** `tests/execution.test.ts`, `tests/diagnostic.test.ts`, and
`examples/01-basics.nit`.

### Requirement: Lexical/static scope

**PDF:** Page 5

**Where:**

- `src/semantic/symbols/symbol-table.ts`
- `src/semantic/resolver.ts`
- `src/runtime/environment.ts`
- `src/runtime/store.ts`

**How:** Resolution assigns a stable binding identity to each declaration and
identifier use. Runtime environments map those binding IDs to locations.
Nested scopes create new environments, so shadowed names remain independent.

**Evidence:** Scope and shadowing tests appear in `tests/execution.test.ts`,
`tests/differential.test.ts`, and `tests/memory.test.ts`.

## 3. Control Flow

### Requirement: Conditional and loop statements

**PDF:** Page 5

**Where:**

- `src/semantic/type-checker.ts`
- `src/interpreter/interpreter.ts`
- `src/bytecode/compiler.ts`
- `src/vm/vm.ts`

**How:** `if/then/else` and `while/do` require Boolean conditions. The
interpreter executes their Core AST nodes directly. The compiler emits
conditional and unconditional jumps for the VM.

**Evidence:** `tests/execution.test.ts`, `tests/vm.test.ts`, and
`examples/02-control-flow.nit`.

### Requirement: High-level `for` loop

**PDF:** Page 8

**Where:** `src/desugar/desugar.ts`

**How:** `for i in range(start, end)` is lowered before execution into hygienic
temporary bindings, a `while` loop, and assignments. Both bounds are evaluated
once, in source order. No dedicated `for` case exists in the Core evaluator.

**Evidence:** `tests/desugar.test.ts` checks the generated Core structure,
hygienic identities, and once-only bounds. Runtime behavior is checked by
`tests/execution.test.ts` and `examples/02-control-flow.nit`.

### Requirement: A second desugared construct

**PDF:** Page 8

**Where:** `src/desugar/desugar.ts`

**How:** `and` and `or` are lowered to Core conditional expressions. This
preserves short-circuit behavior without duplicating logic in the interpreter.

**Evidence:** `tests/desugar.test.ts`, `tests/differential.test.ts`, and the
division-by-zero short-circuit test in `tests/execution.test.ts`.

## 4. Functions and Functional Programming

### Requirement: Functions, calls, and recursion

**PDF:** Pages 5-6

**Where:**

- `src/runtime/closure.ts`
- `src/semantic/type-checker.ts`
- `src/interpreter/interpreter.ts`

**How:** Function declarations create closures containing the function body and
lexical environment. Calls validate arity and argument types, allocate fresh
parameter locations, and propagate return values. A function's binding is
available inside its body, enabling recursion.

**Evidence:** Function, arity, return-path, and recursion tests are in
`tests/execution.test.ts`. A recursive factorial is in
`examples/03-functions-closures.nit`.

### Requirement: Lambdas as first-class values

**PDF:** Page 6

**Where:**

- `src/ast/surface/index.ts`
- `src/ast/core/index.ts`
- `src/semantic/type-checker.ts`
- `src/interpreter/interpreter.ts`

**How:** Lambda expressions evaluate to closure values. They can be assigned,
returned, passed to functions, and called like named functions.

**Evidence:** Lambda and nested-lambda tests are in `tests/execution.test.ts`.

### Requirement: Closures capture lexical variables

**PDF:** Pages 6-7

**Where:** `src/runtime/closure.ts`, `src/runtime/environment.ts`, and
`src/interpreter/interpreter.ts`

**How:** A closure retains its defining environment. Environments contain
locations rather than copied values, so captured variables survive their
original call and later mutations remain visible.

**Evidence:** The closure tests in `tests/execution.test.ts` include returned,
nested, shadowed, and mutated captures. The runnable demonstration is
`examples/03-functions-closures.nit`.

### Requirement: Lists and a higher-order `map`

**PDF:** Pages 6-7

**Where:**

- `src/runtime/values.ts`
- `src/semantic/type-checker.ts`
- `src/interpreter/interpreter.ts`

**How:** List literals create immutable homogeneous `List<T>` values. Empty
lists require an expected element type. The polymorphic `map` builtin validates
its callback and invokes it once per element, in order.

**Evidence:** List and map tests, including invalid heterogeneous lists, are in
`tests/execution.test.ts`. See `examples/04-lists-map.nit`.

## 5. Memory and References

### Requirement: Values, variables, references, and memory locations

**PDF:** Page 7

**Where:**

- `src/runtime/location.ts`
- `src/runtime/environment.ts`
- `src/runtime/store.ts`
- `src/runtime/values.ts`

**How:** The runtime separates all four concepts. An `Environment` maps binding
IDs to `Location` objects, and the `Store` maps locations to runtime values.
`ref variable` stores the variable's existing location. `reference := value`
writes through that location, while normal `=` replaces the value in the
reference variable's own location.

**Evidence:** `tests/memory.test.ts`, the reference tests in
`tests/execution.test.ts`, and `examples/05-references.nit`.

## 6. Static Type Checking

### Requirement: Type checking before execution

**PDF:** Pages 8-9

**Where:** `src/pipeline.ts` and `src/semantic/type-checker.ts`

**How:** `run`, `bytecode`, and `runVm` all call `check` first. The checker
validates variable assignment, arithmetic operands, comparisons, conditions,
function and method arguments, function returns, lists, fields, constructors,
references, exceptions, and pattern matches. Execution begins only after the
entire program has passed.

**Evidence:** The `static errors prevent every side effect` test in
`tests/execution.test.ts` proves that invalid programs produce no earlier
output. Every feature family also includes negative type tests.

## 7. Object-Oriented Programming

### Requirement: Classes, objects, fields, methods, and initialization

**PDF:** Pages 9-10

**Where:**

- `src/runtime/class.ts`
- `src/runtime/store.ts`
- `src/semantic/type-checker.ts`
- `src/interpreter/interpreter.ts`

**How:** Classes define typed fields and methods. `new` allocates an object and
field locations, binds `this`, and invokes `init`. Fields begin with an internal
`UNINITIALIZED` sentinel; reading or leaving one uninitialized produces a
controlled runtime error.

**Evidence:** Class construction, field mutation, method call, identity, and
invalid initialization tests are in `tests/execution.test.ts`.

### Requirement: Single inheritance and method overriding

**PDF:** Page 10

**Where:** `src/runtime/class.ts`, `src/semantic/type-checker.ts`, and
`src/interpreter/interpreter.ts`

**How:** Each class has at most one parent. Inherited fields and methods are
collected through the parent chain. Overrides must preserve parameter types and
use an assignable return type. Invalid parents and conflicting inherited
members are rejected statically.

**Evidence:** Single-inheritance and invalid-override tests are in
`tests/execution.test.ts`. See `examples/06-classes.nit`.

### Requirement: Dynamic dispatch and polymorphism

**PDF:** Page 10

**Where:** Method lookup in `src/interpreter/interpreter.ts`

**How:** Method lookup begins at the object's runtime class, not the variable's
static type, and then walks the parent chain. A derived object stored in a base
typed variable therefore invokes the derived override.

**Evidence:** `tests/execution.test.ts` verifies dispatch through three
inheritance levels and through a base-class method calling an overridden method.

## 8. Exceptions and Evaluation Strategy

### Requirement: `throw` and `try/catch`

**PDF:** Pages 10-11

**Where:**

- `src/runtime/completion.ts`
- `src/interpreter/interpreter.ts`
- `src/pipeline.ts`

**How:** A language-level `ControlSignal` carries thrown values through nested
blocks, loops, and calls to the nearest catch handler. An uncaught throw is
converted at the pipeline boundary into a controlled Runtime Error. Internal
runtime faults are diagnostics and are not accidentally caught as language
exceptions.

**Evidence:** Exception propagation, nested handlers, rethrow, loop behavior,
and uncaught exceptions are tested in `tests/execution.test.ts` and
`tests/cli-process.test.ts`. See `examples/07-exceptions.nit`.

### Requirement: Eager/call-by-value evaluation

**PDF:** Page 11

**Where:** Call and expression evaluation in `src/interpreter/interpreter.ts`

**How:** The interpreter evaluates the callee and arguments eagerly from left
to right, then stores argument values in fresh parameter locations. Binary
operands, lists, constructor arguments, and map elements also preserve
left-to-right order. `and` and `or` are the specified short-circuit exceptions.

**Evidence:** Order and once-only evaluation tests are in
`tests/execution.test.ts` and `tests/desugar.test.ts`.

## 9. Bytecode and Virtual Machine

### Requirement: Compile and execute a mandatory VM subset

**PDF:** Pages 11-12

**Where:**

- `src/bytecode/instruction.ts`
- `src/bytecode/compiler.ts`
- `src/bytecode/chunk.ts`
- `src/vm/vm.ts`

**How:** The compiler translates checked Core AST into stack bytecode. The VM
implements literals, unary and binary operators, variables, assignment, print,
scope management, conditional jumps, and loops. Its instruction set is:

```text
CONST DEFINE LOAD STORE UNARY BINARY
JUMP JUMP_IF_FALSE ENTER_SCOPE EXIT_SCOPE POP PRINT HALT
```

The disassembler exposes generated bytecode through the `bytecode` CLI command.
Advanced tree-interpreter features are rejected with a controlled unsupported
feature diagnostic, which is permitted by the assignment.

**Evidence:** `tests/bytecode.test.ts`, `tests/vm.test.ts`, and
`tests/differential.test.ts`. Differential tests run identical programs on the
interpreter and VM and compare their output. `examples/02-control-flow.nit`
runs on both backends.

## 10. Formal Semantics

### Requirement: Operational semantics

**PDF:** Page 12

Let `rho` map bindings to locations, `sigma` map locations to runtime values,
and `<e, rho, sigma> => <v, sigma'>` mean that evaluating `e` produces `v` and a
new store.

```text
[INT]    <n, rho, sigma> => <Int(n), sigma>

         rho(x) = l        sigma(l) = v
[VAR]    --------------------------------
         <x, rho, sigma> => <v, sigma>

         <e1, rho, sigma> => <Int(n1), sigma1>
         <e2, rho, sigma1> => <Int(n2), sigma2>
         n = checkedAdd(n1, n2)
[ADD]    ---------------------------------------
         <e1 + e2, rho, sigma> => <Int(n), sigma2>

         <c, rho, sigma> => <Bool(true), sigma1>
         <s1, rho, sigma1> => sigma2
[IF-T]   ---------------------------------------
         <if c then s1 else s2, rho, sigma> => sigma2

         <f, rho, sigma> => <Closure(params, body, rhoC), sigma1>
         arguments evaluate left-to-right to values in sigmaA
         rhoCall = bindFresh(params, values, rhoC)
         <body, rhoCall, sigmaA> => <return v, sigmaFinal>
[CALL]   ---------------------------------------------------------
         <f(arguments), rho, sigma> => <v, sigmaFinal>
```

These rules correspond to `src/runtime/environment.ts`,
`src/runtime/store.ts`, `src/runtime/primitive-operations.ts`, and the evaluator
in `src/interpreter/interpreter.ts`. Executable arithmetic and closure examples
are in `tests/formal-examples.test.ts`.

### Requirement: Denotational semantics for base expressions

**PDF:** Page 12

```text
E[n](rho, sigma)       = Int(n)
E[true](rho, sigma)    = Bool(true)
E[x](rho, sigma)       = sigma(rho(x))
E[e1 + e2](rho, sigma) = checkedAdd(E[e1](rho, sigma), E[e2](rho, sigma))
E[not e](rho, sigma)   = Bool(not unboxBool(E[e](rho, sigma)))
```

`checkedAdd` accepts only integer values and reports overflow. Its executable
counterpart is `src/runtime/primitive-operations.ts`.

## 11. Hoare Logic

### Requirement: Assignment example

**PDF:** Page 12

```text
Precondition:  { x = 4 }
Program:       x = x + 3
Postcondition: { x = 7 }
```

Applying the assignment rule substitutes `x + 3` into the postcondition. The
resulting obligation is `x + 3 = 7`, which follows from `x = 4`.

**Evidence:** `tests/hoare-examples.test.ts` executes the program and verifies
that it prints `7`.

### Requirement: Loop example

**PDF:** Page 12

```text
Precondition:  { n = N and N >= 0 and result = 1 }
Program:       while n > 0 do { result = result * n; n = n - 1 }
Invariant:     { result * n! = N! and n >= 0 }
Postcondition: { result = N! and n = 0 }
```

The invariant holds before the loop. Multiplying `result` by `n` and then
decrementing `n` preserves it. At termination, `n <= 0` and the invariant's
`n >= 0` imply `n = 0`, so `result = N!`.

**Evidence:** `tests/hoare-examples.test.ts` executes the case `N = 5` and
verifies `result = 120` and `n = 0`.

## 12. Advanced Extensions

### Requirement: At least one language/runtime extension

**PDF:** Page 13

#### Extension A: Type inference

**Where:** `src/semantic/type-checker.ts`

**How:** Unannotated `let` declarations infer their type from the initializer.
Non-recursive functions infer a common return type, lambdas infer their result
from the body, and related class return values join at a common ancestor.
Parameters remain annotated, and recursive functions require an explicit return
type to keep inference deterministic.

**Evidence:** Inference and incompatible-return tests are in
`tests/execution.test.ts`.

#### Extension B: Pattern matching

**Where:**

- `src/frontend/parser.ts`
- `src/ast/surface/index.ts`
- `src/ast/core/index.ts`
- `src/semantic/type-checker.ts`
- `src/interpreter/interpreter.ts`

**How:** `match` supports integer, Boolean, and string literal patterns plus a
final `_` wildcard. The scrutinee evaluates once. Static checking rejects
non-exhaustive matches, duplicate or unreachable arms, pattern type mismatches,
and incompatible arm results.

**Evidence:** Pattern-matching tests are in `tests/execution.test.ts`. The
runnable example is `examples/08-pattern-matching.nit`.

## 13. Error Handling

### Requirement: Distinct controlled error categories

**PDF:** Pages 13-14

**Where:**

- `src/diagnostics/diagnostic.ts`
- `src/pipeline.ts`
- `src/cli/cli.ts`

**How:** `DiagnosticCategory` defines `Syntax Error`, `Type Error`, and
`Runtime Error`. Expected language failures are converted into structured
diagnostics with a source span. The CLI renders the source line and caret and
does not expose a host stack trace.

**Evidence:** `tests/diagnostic.test.ts`, `tests/cli-process.test.ts`, and the
invalid-program cases across the test suite.

## 14. Testing and Deliverables

### Requirement: Tests for valid, invalid, boundary, and integrated behavior

**PDF:** Page 14

**Where:** `tests/`

**How and evidence:**

- Normal execution: `tests/execution.test.ts` and `tests/examples.test.ts`
- Boundary cases: `tests/primitive-operations.test.ts`, `tests/lexer.test.ts`,
  `tests/parser.test.ts`, and `tests/stress.test.ts`
- Scope shadowing: `tests/execution.test.ts` and `tests/differential.test.ts`
- Recursion and closures: `tests/execution.test.ts`
- Type and runtime errors: `tests/execution.test.ts` and
  `tests/diagnostic.test.ts`
- OOP, inheritance, and overriding: `tests/execution.test.ts`
- Exception handling: `tests/execution.test.ts`
- Bytecode and VM execution: `tests/bytecode.test.ts` and `tests/vm.test.ts`
- Backend parity: `tests/differential.test.ts`
- Extensions: type inference and matching tests in `tests/execution.test.ts`
- Real CLI behavior: `tests/cli-process.test.ts`

Tests submit real NITLang source to the actual pipeline. No interpreter branch
recognizes test names or hard-codes expected program output.

### Requirement: Source, tests, examples, README, and design report

**PDF:** Page 14

**Where:**

- Source code: `src/`
- Automated tests: `tests/`
- Runnable programs: `examples/`
- Entry documentation: `README.md`
- Operations and architecture: `docs/RUNBOOK.md`
- Language and design rules: `docs/LANGUAGE.md`
- Requirement evidence, formal semantics, and Hoare logic: this document

The nine numbered examples cover primitives, control flow, functions, closures,
lists, higher-order map, references, classes, inheritance, dispatch,
exceptions, pattern matching, and an integrated showcase. Every example is
executed by `tests/examples.test.ts`.

## 15. Presentation Readiness

### Requirement: Demonstrate real behavior on changed and unseen programs

**PDF:** Pages 15-16

**Where:**

- `docs/RUNBOOK.md`
- `tests/stress.test.ts`
- `tests/differential.test.ts`
- `examples/`

**How:** The runbook provides a presentation sequence using `ast`, `core-ast`,
`bytecode`, `run`, and `vm`. Stress tests alter names, values, nesting, and
feature combinations. Differential tests send the same new source through both
backends. This validates general language behavior rather than memorized sample
programs.

## Final Verification

Run the complete acceptance gate from the repository root:

```sh
bun run check:all
```

It checks Prettier formatting, strict TypeScript compilation, and the complete
test suite. At the time this checklist was updated, the result was:

```text
304 tests passed
0 tests failed
1785 assertions
```
