# Milestone 6

Implemented separate Core expression/statement unions and a pure Surface-to-Core
lowerer. Only common immutable source leaves/annotations share types. For lowers
to a block, once-only int bounds, loop cell and while/increment. Generated @ names
cannot appear in source identifiers. The user body keeps its own scope so an inner
loop-variable declaration cannot capture the increment. And/or lower to conditional
expressions. Grouping/empty statements disappear, preserving source spans.

Validation: bun run check:all, including direct logical, hygienic-range and nested
class/function lowering tests. Next: M7 resolution, types and checked primitive
execution. Professor question: why not evaluate both logical operands in a helper?
That would lose short circuit and permit unintended effects/errors on the right.
