# Milestone 16

Implemented explicit Return/Throw control signals and nearest try/catch handling.
Catch introduces a fresh opaque static binding while runtime stores the thrown
language value. Rethrows, calls, loops and nested handlers propagate correctly;
return is not intercepted. Uncaught throws become located Runtime diagnostics at
the pipeline boundary without host stacks. Runtime faults remain non-catchable.
Full check:all passes. Next M17 diagnostic hardening.
