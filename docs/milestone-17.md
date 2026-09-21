# Milestone 17

Hardened diagnostics across lexer/parser/checker/interpreter/CLI. The renderer can
show unchanged source lines and half-open range carets while retaining the compact
format for API callers without SourceFile. CLI source failures use exit 1, invocation
and I/O failures use 2, and expected language errors omit host stacks. Syntax,
Type and Runtime categories remain distinct. Full check:all passes. Next bytecode.
