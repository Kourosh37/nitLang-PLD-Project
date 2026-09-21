# Milestone 18

Added explicit data-only instructions, immutable chunks, compiler and disassembler
for literals, primitive operators, bindings, assignment, print, blocks, conditionals
and loops. Conditional expressions support lowered and/or. Forward jump operands
are patched after branch/body emission. Unsupported checked constructs fail before
VM execution. Tests validate targets and readable output. Next M19 stack VM.
