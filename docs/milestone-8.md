# Milestone 8

Added checked identifier assignment and bool-only if/while execution. Assignment
updates an existing store cell; each executed body block gets a child environment.
For lowering now runs through this same core control flow. Tests verify user-body
shadowing cannot capture increment, range end is captured once, empty ranges,
mutation and invalid assignment/condition types. Full check:all passed. Next M9
functions/return/recursion. No JavaScript truthiness defines branch semantics.
