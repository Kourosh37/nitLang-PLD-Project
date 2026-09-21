# Bytecode and virtual machine

The bytecode backend accepts only successfully checked Core programs in its
documented subset. It rejects every unsupported node before constructing a VM.
Instructions contain data and source spans, never TypeScript callbacks.

| Instruction | Operand | Stack effect | Meaning |
| --- | --- | --- | --- |
| CONST | tagged primitive | `[] -> [v]` | Push a literal |
| DEFINE | binding ID | `[v] -> []` | Define in current scope |
| LOAD | binding ID | `[] -> [v]` | Read nearest scope |
| STORE | binding ID | `[v] -> []` | Update nearest scope |
| UNARY | `-` or `not` | `[v] -> [r]` | Shared checked primitive operation |
| BINARY | arithmetic/comparison/equality | `[left,right] -> [r]` | Pop right then left |
| POP | none | `[v] -> []` | Discard expression result |
| PRINT | none | `[v] -> []` | Emit formatted value |
| JUMP | target offset | unchanged | Set instruction pointer |
| JUMP_IF_FALSE | target | `[bool] -> []` | Conditional branch |
| ENTER_SCOPE | none | unchanged | Push lexical value map |
| EXIT_SCOPE | none | unchanged | Pop non-root map |
| HALT | none | requires empty stack/root scope | End execution |

The compiler emits `-1` jump placeholders internally and patches them after the
branch or loop body. Disassembly uses zero-padded instruction offsets. The VM owns
an operand stack, instruction pointer and scope stack. DEFINE/STORE consume their
value, and print expressions are statements in the accepted subset, keeping HALT
balanced. Arithmetic and formatting reuse the same primitive-semantics module as
the interpreter. Differential tests still run each backend independently.

Supported constructs: primitive literals/operators, variables, assignment,
blocks, print, if, while, and lowered for/and/or. `bytecode` prints instructions;
`vm` executes them. Unsupported constructs receive a located Type Error before
the first instruction executes.

Professor question: why patch absolute targets rather than emit nested host
functions? Numeric targets make control flow inspectable, serializable in principle,
and executable by an independent instruction loop.
