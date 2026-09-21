# Milestone 5

Implemented Location object identities, per-execution Store and lexical Environment.
Environment maps resolved numeric binding IDs to locations, never directly to values.
Store detects foreign/uninitialized addresses. Child environments retain parents;
cells survive scope exit. No garbage collector is needed for this educational run.

Validation: bun run check:all (strict TypeScript and full test suite). Added memory
tests for fresh cells, outer mutation, independent shadowing, duplicates, undefined
bindings and foreign/uninitialized storage. No source execution yet; M6 lowers Core
syntax and M7 connects checking/execution. Professor question: why location identity
instead of an integer alone? Equal display IDs from separate stores must not alias.
