# Complete EBNF draft

Target grammar, including the deferred pattern-matching extension. Quoted text
denotes tokens; braces mean repetition, brackets mean optional. Identifier,
integer and string follow language-spec.md. Keywords cannot be identifiers.
Whitespace/comments separate tokens but do not delimit statements. Parsing an
expression greedily consumes valid postfix and infix continuations, even across
newlines; use `;` when the next statement could look like a continuation.

```ebnf
program         = { topItem }, EOF ;
topItem         = classDecl | statement ;
statement       = letDecl | functionDecl | block | ifStmt | whileStmt
                | forStmt | returnStmt | tryStmt | throwStmt | exprStmt | ";" ;
block           = "{", { statement }, "}" ;
letDecl         = "let", identifier, [ ":", type ], "=", expression, [ ";" ] ;
functionDecl    = "func", identifier, parameters, [ ":", type ], "=", block, [ ";" ] ;
parameters      = "(", [ parameter, { ",", parameter } ], ")" ;
parameter       = identifier, ":", type ;
ifStmt          = "if", expression, "then", block, [ "else", block ], [ ";" ] ;
whileStmt       = "while", expression, "do", block, [ ";" ] ;
forStmt         = "for", identifier, "in", "range", "(", expression, ",",
                  expression, ")", block, [ ";" ] ;
returnStmt      = "return", ( ";" | expression, [ ";" ] ) ;
tryStmt         = "try", block, "catch", identifier, block, [ ";" ] ;
throwStmt       = "throw", expression, [ ";" ] ;
exprStmt        = expression, [ ( "=" | ":=" ), expression ], [ ";" ] ;

classDecl       = "class", identifier, [ "extends", identifier ], "{",
                  { fieldDecl | functionDecl }, "}", [ ";" ] ;
fieldDecl       = "let", identifier, ":", type, [ ";" ] ;
type            = "int" | "bool" | "string" | "void"
                | "List", "<", type, ">"
                | "Ref", "<", type, ">"
                | "Fn", "(", [ type, { ",", type } ], ")", "->", type
                | identifier ;

expression      = orExpr ;
orExpr          = andExpr, { "or", andExpr } ;
andExpr         = equalityExpr, { "and", equalityExpr } ;
equalityExpr    = relationalExpr, { ( "==" | "!=" ), relationalExpr } ;
relationalExpr  = additiveExpr, { ( "<" | ">" | "<=" | ">=" ), additiveExpr } ;
additiveExpr    = productExpr, { ( "+" | "-" ), productExpr } ;
productExpr     = unaryExpr, { ( "*" | "/" ), unaryExpr } ;
unaryExpr       = ( "-" | "not" ), unaryExpr | "ref", identifier | postfixExpr ;
postfixExpr     = primary, { arguments | ".", identifier } ;
arguments       = "(", [ expression, { ",", expression } ], ")" ;
primary         = integer | string | "true" | "false" | identifier | "this"
                | "(", expression, ")" | listExpr | lambdaExpr | newExpr
                | matchExpr ;
listExpr        = "[", [ expression, { ",", expression } ], "]" ;
lambdaExpr      = "lambda", parameters, "->", expression ;
newExpr         = "new", identifier, arguments ;
matchExpr       = "match", expression, "{", matchArm, { matchArm }, "}" ;
matchArm        = pattern, "=>", expression, [ ";" ] ;
pattern         = [ "-" ], integer | string | "true" | "false" | "_" ;
```

Semantic restrictions supplement grammar: `=` targets an identifier or a field;
`:=` targets an expression of Ref type. Return is legal only in functions; `this`
only within methods or their nested closures. Class declarations are top-level.
Void is result-only. In type position List/Ref/Fn followed by their structural
syntax are recognized before a nominal identifier; these names cannot name classes.
No trailing commas, generic declarations, null, implicit return, indexing,
expression-form if, break, continue, or super are part of the grammar.

Lambda body parsing is greedy: `lambda (x:int) -> x + 1` includes the addition.
To immediately call a lambda, parenthesize it. Match arms use `=>` to distinguish
their pattern from subsequent expression syntax; semicolons are recommended
between arms. Empty matches are invalid. A negative pattern means a negative
integer literal, not arbitrary expression evaluation.

| Binding strength | Operators | Association |
| --- | --- | --- |
| 1 (lowest) | or | left |
| 2 | and | left |
| 3 | == != | left |
| 4 | < > <= >= | left |
| 5 | + - | left |
| 6 | * / | left |
| 7 | unary -, not, ref | right / identifier-only ref |
| 8 (highest) | call, member | left |
