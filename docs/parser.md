# Surface AST and parser

Implemented in Milestone 3. This phase recognizes mandatory language syntax,
not its execution semantics. Pattern matching remains deferred to Milestone 21.

```sh
bun run nitlang ast examples/surface-tour.nit
```

The command reads UTF-8 source, lexes it, parses it and prints the Surface AST as
JSON. It does not execute print, constructors, function calls or any other code.
Exit status is 0 for success, 1 for source syntax errors, and 2 for invocation,
file-read or unavailable-command errors. No partial AST is printed on failure.

## API and boundaries

`parse(source: SourceFile): ParseResult` orchestrates lexing followed by parsing.
`parseTokens(source, tokens): ParseResult` accepts the complete lexer-produced
token stream for that source. The latter requires exactly one terminal EOF;
violating this programmer precondition throws TypeError. It does not re-lex or
validate arbitrary fabricated tokens. Source-originated failures produce a
structured Syntax Error instead. Lexical diagnostics propagate unchanged.

ParseResult is `{ ok: true, program }` or `{ ok: false, diagnostic }`. Parsing
stops at the first syntax error. Internal DiagnosticError is caught at the phase
boundary; implementation bugs are not converted into misleading source errors.
Each call creates an independent parser cursor. Neither API reads disk or emits
output. CLI I/O stays in the CLI modules.

## AST representation

`src/ast/surface/index.ts` defines readonly discriminated unions. Every node has
a SourceSpan, including names, parameters and type annotations. Optional source
constructs use explicit null (absent else, annotation, parent or return value).
Arrays preserve source order. Unlike tokens, AST objects are not runtime-frozen;
consumers must respect their readonly TypeScript contracts.

| Node family | Examples |
| --- | --- |
| Program and declarations | Program, LetDeclaration, FunctionDeclaration, ClassDeclaration, FieldDeclaration |
| Statements | Block, Empty, Expression, Assignment, ReferenceAssignment, If, While, For, Return, Throw, Try |
| Expressions | Identifier, primitive literals, This, Group, Unary, Binary, Reference, Member, Call, List, Lambda, New |
| Annotation syntax | PrimitiveType, NamedType, ListType, ReferenceType, FunctionType |

The table abbreviates Statement/Expression suffixes for readability. TypeAnnotation
is source syntax, not the semantic type representation required in M7. For
example, NamedType retains an unresolved class name. A function's missing result
annotation stays null so the checker can later infer it.

Surface-only constructs remain visible: ForStatement, BinaryExpression with
and/or, grouping and empty statements. M6 will lower them into a distinct Core
AST; this milestone does not define a Core evaluator or execute Surface nodes.
Ordinary assignment has a structurally valid identifier/member target. Reference
assignment accepts an expression whose Ref type will be checked later. Grouping
around an ordinary assignment target is unwrapped; the statement span still
covers the full source including those parentheses.

Program spans cover the entire file. Other node spans begin at their first token
and end after their last token; a consumed optional semicolon belongs to the
statement/declaration span. Group spans include parentheses. Identifier spans
cover only the name. Delimiters and comments retain original UTF-16 positions.

## Parsing strategy

Declarations and statements use recursive descent. Each method follows a grammar
production: blocks, functions, classes, control flow, try/catch and bindings.
Class bodies accept only fields and methods; nested class declarations are
rejected. Comma-delimited lists share a small parser helper and reject trailing
commas. Expression statements recognize assignment only after their left side.

Expressions use precedence climbing with the central table in precedence.ts.
For a binary operator at precedence p, parse its right side with minimum p+1.
That leaves equal-precedence operators for the outer loop, making all binary
operators left associative. Unary operators recurse to the right, while calls
and member access are parsed iteratively at the highest binding strength.
Lambda bodies restart at the lowest precedence and therefore extend greedily.

Whitespace, including newlines, does not terminate expressions. `f\n(1)` is a
call; `f;\n(1)` is two expression statements. Bare return is `return;`, whereas
`return\n1` returns an expression. Longest-match lexing also means a type-closing
`>` must be separated from a following `=`: write `List<int> = []`, not
`List<int>=[]`, whose lexer emits `>=`. No contextual token splitting is added.

Recursive statement/expression/type parsing has a shared limit of 128 active
syntax frames. Excessive nesting produces a located Syntax Error before host
stack overflow. This is an implementation resource bound, not a runtime recursion
limit and not a guarantee of 128 literal parentheses in every context. Flat
statement lists and left-associative operator/postfix chains are iterative.
Very large AST serialization and downstream traversal resource limits are not
yet a general language resource-management system.

## Static checks deferred

The parser accepts undefined identifiers, duplicate bindings, incompatible types,
return outside a function, this outside a method, cyclic inheritance and invalid
reference operand types when their syntax is well formed. Resolver/typechecker
milestones must reject these before execution. This separation is deliberate.
`match` instead gives an explicit deferred-feature Syntax Error until M21.

## Teaching notes

Problem: the lexer gives words and punctuation, but later phases need structure,
such as which multiplication belongs inside an addition. Recursive descent keeps
statement grammar close to its specification; precedence climbing centralizes
operator priority without a separate parsing function for every binary level.
An evaluator embedded in the parser was rejected because it cannot support clean
static checking, independent lowering or multiple execution backends.

Professor question: How does `10 - 3 - 2` associate left? Answer: after seeing
the first minus, its right parse requires a higher precedence, so the second
minus remains for the outer loop. The AST is `(10 - 3) - 2`; no subtraction is
performed during parsing.

Validation includes each operator's associativity, adjacent precedence levels,
postfix/unary combinations, greedy lambdas, all mandatory statement forms, nested
annotations, invalid syntax, exact spans, resource limits and actual CLI/fixture
programs. An AST success is never reported as proof of runtime correctness.
