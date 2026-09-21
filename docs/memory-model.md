# Environment, store and binding contract

Status: this is the M4 contract for M5 implementation. No Environment, Store or
Location class is implemented yet, and none of the runtime scenarios below has
been executed through a checked interpreter. Primitive value objects already
exist in src/runtime/values.ts.

## Concepts

| Concept | Meaning |
| --- | --- |
| Value | Immutable tagged data, or a future composite language value |
| Variable | A lexical binding with a stable location and an assignable type |
| Location | Dedicated identity for a store cell, not a source position |
| Environment | Lexical binding identity -> Location, with an enclosing environment |
| Store | Location -> RuntimeValue, owned by one execution |
| Reference | Future value containing an existing Location |

Runtime Environment and static SymbolTable are different structures. Resolution
decides which binding a source occurrence denotes; runtime lookup finds that
binding's location, and the store supplies its current value. SourceSpan describes
text positions and must never be confused with a runtime Location.

## Declaration contract

1. Check duplicate names in the current lexical scope statically.
2. Resolve/typecheck the initializer before introducing the new binding. An outer
   binding of the same spelling is visible; the new binding is not self-visible.
3. During execution, evaluate the initializer exactly once in the current environment.
4. If it completes normally, allocate a fresh location containing its value.
5. Extend the current environment with the resolved binding and that location.

A failing initializer introduces no binding. An absent annotation infers the
initializer's type; an explicit annotation constrains it through assignability.
Void initializers are invalid. Type inference does not execute the initializer.
Self-recursive function declaration uses its separately specified prebinding
protocol and is not an ordinary let initializer.

## Block and assignment contract

Entering a block creates a child environment. Statements run in order; name
lookup searches the lexical chain. A shadowing let always allocates a new cell.
Ordinary assignment resolves its target location before evaluating the right
side, then updates that cell without allocating a replacement binding. Scope
exit removes the active environment link, not locations still retained by future
closures or references. An initial per-execution store may keep all cells until
the run finishes; garbage collection is deferred.

There is no name-to-value shortcut, dynamic scoping or copying captured primitive
values. Future object fields also own locations, and `ref x` points to x's existing
cell. Reference write-through updates the referenced cell rather than the cell
that contains the ReferenceValue itself.

## Acceptance scenarios

The fixture tests/fixtures/valid/primitive-bindings.nit currently verifies parsing
of nested declarations and initializer dependencies. Once the checked execution
pipeline exists, its required output is:

```text
inner
12
false
10
NITLang
```

The inner count initializer reads the outer count (10), then allocates a distinct
cell holding 12. The inner enabled similarly reads true then stores false in a
new cell. The innermost title does not change the outer title. These are required
future outcomes, not currently passing runtime assertions.

Additional acceptance cases for M5/M7:

- Two declarations with the same initial value allocate distinct locations.
- Assigning an outer variable from a child scope updates the outer cell.
- A child declaration shadows without altering its parent's binding or cell.
- An undefined name and same-scope duplicate are Type Errors before execution.
- A location absent from the store cannot silently read as JavaScript undefined.
- Escaping references/closures in later milestones retain the same captured cells.

## Teaching note

Professor question: Why split a variable from its value? Answer: two names or
reference values can alias one cell, while two shadowed declarations must remain
independent even if their values are equal. Environment identifies cells and
Store holds their changing contents. The split makes both behaviors explicit
and gives the type checker a separate static binding model.
