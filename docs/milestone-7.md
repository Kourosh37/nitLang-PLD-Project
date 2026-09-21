# Milestone 7

Implemented separate scoped symbol tables/resolver, explicit type representations,
central assignability and a checker that precedes all execution. Binding IDs are
stable and initializer references resolve before new declarations. Interpreter
consumes only Core AST and uses Environment/Store for primitive bindings/blocks.
Run/check/core-ast CLI commands now connect the actual pipeline. Runtime guards
remain defensive, not substitutes for type checking.

Validation: bun run check:all, including real-source shadowing, no effects on static
failure, undefined/duplicate/type errors, short circuit and check-only division by
zero. Control statements/functions/composites still have explicit unsupported
diagnostics until their milestones. Next M8 control flow/assignment. Professor
question: why separate symbol tables? Static types cannot be runtime store cells.
