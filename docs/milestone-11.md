# Milestone 11

Added immutable ListValue, homogeneous invariant List types, contextual empty
lists and typed map. Map evaluates callback then list, invokes once per element in
order, uses normal closure calls and returns a new immutable list. Formatting is
recursive. Tests cover closures in map, empty lists and invalid elements/callbacks.
Full check:all passed. Next M12 references. Professor question: why reject bare
`[]`? Without generics/unification it has no defensible element type.
