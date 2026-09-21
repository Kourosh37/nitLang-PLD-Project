# NITLang Language Rules

This document is the compact contract for the implemented language.

## Lexical Rules

Identifiers match `[A-Za-z_][A-Za-z0-9_]*` and are case-sensitive. Integers are
decimal safe integers. Strings use double quotes and support `\"`, `\\`, `\n`,
`\r`, and `\t`. Comments are `//` line comments or non-nested `/* ... */`
comments. Whitespace and newlines are insignificant; semicolons are optional
unless needed to separate otherwise ambiguous expressions.

Keywords are:

```text
let func return lambda if then else while do for in range and or not ref
class extends this new try catch throw match int bool string void true false
```

## Types and Values

The types are `int`, `bool`, `string`, `void`, nominal class types, `List<T>`,
`Ref<T>`, and `Fn(T, ...) -> T`. There are no implicit conversions. Lists and
references are invariant; function results are covariant; derived objects are
assignable to ancestor types. `void` is valid only as a function result.

Integers use the safe-integer range. Arithmetic overflow and division by zero
are runtime errors; division truncates toward zero. Conditions must be boolean.
Equality accepts matching primitive values or related class values; objects
compare by identity.

## Bindings and Control Flow

```nitlang
let total:int = 0
if total == 0 then { total = 1 } else { total = 2 }
while total < 3 do { total = total + 1 }
for i in range(0, 3) { print(i) }
```

`let` bindings are mutable and infer their type when no annotation is present.
Blocks create lexical scopes; inner bindings may shadow outer ones. Declarations
are visible sequentially, so forward references and mutual recursion are not
supported. `for` is ascending, start-inclusive, end-exclusive, and evaluates
both bounds once. `and` and `or` short-circuit.

Operator precedence from low to high is `or`, `and`, `== !=`, `< <= > >=`,
`+ -`, `* /`, prefix `- not ref`, then call and member access. Binary operators
associate left; evaluation order is left to right. Assignment is a statement.

## Functions, Closures, and Lists

```nitlang
func add(x:int, y:int):int = { return x + y }
let twice:Fn(int) -> int = lambda (x:int) -> x * 2
let values:List<int> = map(twice, [1, 2, 3])
```

Parameters require types. A named function may recurse; recursive functions
require an explicit result type. Other function results may be inferred from
their returns. Non-void functions must return or throw on every path. Lambdas
have one expression body and capture lexical locations, so later assignment is
visible to the closure.

Lists are homogeneous and immutable. Empty lists need an expected `List<T>`
type. There is no indexing. `map(callback, list)` invokes the callback once per
element in order. `print(value)` emits one line. These polymorphic builtins must
be called directly and cannot be stored as values.

## References

`ref variable` captures the variable's existing storage location. If `r` is a
reference, `r := value` writes through it; `r = otherReference` replaces the
reference stored in `r`. There is no implicit dereference or read operator.

## Classes

```nitlang
class Point {
  let x:int
  func init(x:int) = { this.x = x }
  func value():int = { return this.x }
}
```

Classes are top-level nominal declarations. Fields require types and are
initialized by `init`; reading or leaving a field uninitialized is a runtime
error. Single inheritance uses `extends` and requires an earlier parent class.
Inherited fields cannot be redeclared. Overrides keep identical parameter types
and an assignable result. Method dispatch uses the object's runtime class.
Constructors inherit when omitted; an explicit derived constructor must
initialize inherited fields. There is no `super`, private member, or field
initializer syntax.

## Exceptions and Matching

```nitlang
try { throw "problem" } catch error { print(error) }

let label = match true {
  true => "yes";
  false => "no"
}
```

`throw` accepts any non-void value. `catch` handles the nearest language throw;
runtime faults are not catchable. There is no `finally`. A caught value can be
printed or rethrown, but its opaque type cannot be used in arithmetic or member
access.

`match` accepts int, bool, or string scrutinees and evaluates them once. Arms use
literal patterns and `_` as a final wildcard. Boolean matches may instead list
both values. Duplicate, unreachable, non-exhaustive, or differently typed arms
are static errors.

## Compact Grammar

```ebnf
program      = { classDecl | statement }, EOF ;
statement    = letDecl | functionDecl | block | ifStmt | whileStmt | forStmt
             | returnStmt | tryStmt | throwStmt | exprStmt | ";" ;
letDecl      = "let", id, [ ":", type ], "=", expression, [ ";" ] ;
functionDecl = "func", id, parameters, [ ":", type ], "=", block, [ ";" ] ;
ifStmt       = "if", expression, "then", block, [ "else", block ], [ ";" ] ;
whileStmt    = "while", expression, "do", block, [ ";" ] ;
forStmt      = "for", id, "in", "range", "(", expression, ",", expression,
               ")", block, [ ";" ] ;
tryStmt      = "try", block, "catch", id, block, [ ";" ] ;
classDecl    = "class", id, [ "extends", id ], "{",
               { fieldDecl | functionDecl }, "}", [ ";" ] ;
type         = "int" | "bool" | "string" | "void" | "List", "<", type, ">"
             | "Ref", "<", type, ">" | "Fn", "(", [ type, { ",", type } ],
               ")", "->", type | id ;
```

Assignment targets must be variables or fields; `:=` targets a `Ref<T>`
expression. `return` is legal only in functions and `this` only in methods or
closures nested in methods.

## VM Subset and Limits

The VM supports primitive literals and operators, variables, assignment, blocks,
`print`, `if`, `while`, and lowered `for`, `and`, and `or`. The tree interpreter
implements the complete language. Unsupported VM features produce a controlled
diagnostic before execution. Parser nesting and runtime call depth are limited
to 128, and storage is reclaimed when the process run ends.
