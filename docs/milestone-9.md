# Milestone 9

Named functions use closure values holding defining environments; prebinding a
store cell supports self recursion. Calls allocate fresh parameter cells and use
controlled Return signals. Arity, argument/return types and conservative all-path
returns are checked before execution. Unannotated nonrecursive results are joined;
recursive inference requires an annotation. A 128-call runtime bound gives a
controlled diagnostic instead of a host stack overflow. Validation: full check:all
with factorial, procedures, inferred returns and rejection cases. Next M10 lambdas
and escaping closures. Professor question: why not use the caller environment?
That would implement dynamic scope and change the meaning of captured names.
