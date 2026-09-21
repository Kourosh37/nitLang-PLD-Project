# Milestone 21: pattern matching extension

Implemented match expressions with int/bool/string literal patterns and `_`.
The scrutinee is evaluated once. Static checking enforces pattern type, duplicate
and unreachable-arm rejection, compatible result types and exhaustiveness: bool
may list both values; int/string require a final wildcard. Runtime selects the
first matching arm. The VM subset rejects match explicitly. Tests cover single
evaluation and invalid programs. Full check:all passes.
