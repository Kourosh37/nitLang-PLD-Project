# Milestone 10

Implemented anonymous function type checking and runtime closure values. Lambda
parameters have explicit types; expression result types are inferred. Closures
retain the defining Environment, whose bindings point to shared Store locations,
so escaping, nested, multi-capture, shadowing and post-creation mutation behave
lexically. Calls use the same arity/type and fresh-parameter-cell path as named
functions. Full check:all passes. Next M11 lists/map.

Professor question: why capture an Environment instead of current primitive
values? Capturing cells preserves aliasing and mutations and supports nested
closures after the defining call returns.
