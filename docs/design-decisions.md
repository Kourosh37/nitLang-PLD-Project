# Design decisions

These decisions resolve assignment ambiguities before implementation. They were
finalized in Milestone 1; changes must update docs and tests.

| Question | Decision and reason |
| --- | --- |
| Project size | GROUP_SIZE = 1; match is the only planned extension. |
| Statement boundaries | Whitespace-independent grammar and optional semicolons; bare return requires a semicolon to avoid newline-sensitive ambiguity. |
| Integers | Safe signed integers, checked overflow, truncating division; straightforward portable TS/VM semantics. |
| Logical negation | Add explicit `not` alongside required and/or. |
| Type syntax | Expose void result annotations and List/Ref/Fn types for empty lists, references and higher-order parameters. |
| Forward declarations | Sequential lexical declarations; self recursion only, with annotated recursive result. Avoid unsound unresolved inference cycles. |
| Inference | Local initialization, lambda results, and a small return-type join; no general unification. |
| Missing returns | Conservative structural analysis, no loop termination proof. |
| Equality | Primitives by value, compatible objects by identity; no structural list/function/reference equality. |
| Empty lists | Require contextual List type; no implicit unknown/any element type. |
| Builtins | Typed polymorphic callable values; direct calls only for print/map in the base checker. User closures remain fully first-class. |
| Catch binding | Internal opaque thrown-value type; permit print/rethrow without introducing dynamic arithmetic. |
| Runtime faults | Not catchable; catch handles explicit language throws, including propagation from calls. |
| Fields | Explicit locations, runtime uninitialized checks, no default primitive values. |
| Constructors | Inherit init or synthesize zero-argument init; explicit derived init initializes inherited fields. No super syntax. |
| Overrides | Invariant parameters, covariant returns; constructor signatures excluded. |
| Function subtyping | Invariant parameters, covariant returns; mutable lists/references invariant (lists currently immutable). |
| Memory ownership | Per-execution store, no explicit GC initially; closures retain locations until run finishes. |
| VM scope | Reject unsupported constructs before any execution; no interpreter fallback. |
| Hygiene | Generated binding identities cannot collide with source identifiers. |
| Pattern matching | Primitive literal patterns and final wildcard, static exhaustiveness; deferred until mandatory implementation is stable. |

## Dependency adjustment

The prompt requires design documents before code, while milestones put setup
before specification. Write specification/grammar/architecture drafts first in
Milestone 0, then finalize them and implement SourceSpan in Milestone 1.

Milestone 4 describes execution before the mandated memory model, lowering and
checker exist. It will define/test primitive and binding contracts without exposing
an unchecked run path. Milestones 5-7 provide storage, Core lowering and checking;
only then enable primitive end-to-end execution. This avoids a temporary
name-to-value evaluator that would violate the assignment invariants.

## Teaching notes plan

Each nontrivial implementation milestone records: problem, chosen architecture,
alternative considered, runtime behavior, static checking, and a professor Q&A.
Example: Why split Environment and Store? Environment identifies a binding's
location; Store holds its mutable contents. Two references can alias that location
while shadowed variables allocate independent ones. A direct name-to-value map
would obscure aliasing. This is a design explanation, not implemented runtime code.

## Milestone 1 clarifications

- Keep original UTF-16 source text, not normalized text or grapheme indices.
  Recognize LF, CR and CRLF; tabs count as one column. Positions within a CRLF
  pair remain on the previous line. This gives every valid offset one position.
- Source spans carry a display name, not a dependency on disk paths or Bun I/O.
  SourceFile validates offset ranges and freezes returned positions/spans.
  Invalid API offsets are programmer RangeErrors, not NITLang Runtime Errors.
- Require a semicolon before a match arm whose pattern would be consumed as
  part of the preceding expression. This resolves negative-pattern ambiguity
  without changing the assignment's separator-free ordinary examples.
- Let initializers see outer scopes before introducing the new binding. Function
  parameters share the function body's outer scope; catch bindings share their
  handler scope. Builtins may be shadowed. Declaration functions/classes are
  read-only, but function values stored in let bindings remain mutable.
- Recursive method inference cycles require explicit result annotations. Return
  inference excludes nested functions, checks unreachable statements, and uses
  conservative try/catch path analysis. These avoid inference-order accidents.

## Milestone 3 decisions

- Surface annotations are syntax nodes, not semantic types. All AST nodes retain
  spans; optional constructs use explicit null and source-order arrays are readonly.
- Keep grouping, empty statements, for and logical operators visible until
  lowering; do not manufacture Core nodes in the parser.
- Centralize binary precedence and use precedence climbing with p+1 on the right
  for left association. Statement parsing remains recursive descent.
- Permit parentheses around identifier/field assignment targets. Ref assignment
  remains expression-shaped pending type checking.
- Introduce a controlled 128-frame syntactic recursion limit, distinct from
  runtime recursion. Long flat operator chains remain iterative.
- Enable ast now because its complete dependency chain exists; do not enable
  check or run before their semantic pipeline is implemented. File I/O is injected
  into CLI tests and performed only at the actual process boundary.

## Milestone 4 decisions

- Implement immutable tagged primitives and internal void before composite
  runtime values. Keep factories as the construction boundary and canonicalize -0.
- Use bigint intermediates for exact arithmetic, then validate safe-integer bounds.
  NITLang int remains a safe-integer number payload; no bigint surface type is added.
- Put shared operator types in src/language, retaining the existing Surface AST
  type re-export. Runtime operations must not import Surface AST.
- Provide defensive operand-kind errors, zero-division/overflow faults and output
  formatting as pure value operations. Static operand validation still belongs
  to M7. Exclude eager and/or operations because they will lower to conditionals.
- Complete the variable/block contract and source-structure fixtures in M4; do
  not claim executed scope behavior before M5-M7 supply the required pipeline.
