# NITLang language specification v1

Finalized in Milestone 1. This is the target contract, not a list of implemented
features. Only tooling, the CLI skeleton and source locations are implemented.
Changes to this contract require an explicit design decision and matching tests.

## Lexical rules

Source is Unicode text; identifiers are ASCII `[A-Za-z_][A-Za-z0-9_]*`, case
sensitive. Keywords are `let func return lambda if then else while do for in
range and or not ref class extends this new try catch throw match int bool
string void true false`. `print`, `map`, `List`, `Ref`, and `Fn` are ordinary
identifiers (the last three have special meaning only in type position).
Decimal integer literals contain digits only. Strings use double quotes and
support `\"`, `\\`, `\n`, `\r`, `\t`; other escapes and raw newlines are errors.
Comments are `//` to end of line and non-nested `/* ... */`. Whitespace, including
newlines, is insignificant. Semicolons are optional statement terminators.
Tokens use longest match (`:=`, `==`, `!=`, `<=`, `>=`, `->`, `=>` before their
prefixes). Punctuation is defined exhaustively by the grammar. Every token,
including EOF, has a half-open span with zero-based UTF-16 offsets and one-based
line/column; CRLF counts as one newline. Columns count UTF-16 code units.
LF and lone CR also end a line. Tabs count as one column; no tab expansion or
Unicode normalization occurs. Whitespace is exactly space, tab, CR and LF;
a leading U+FEFF byte-order mark is ignored but retains its source offset.
Other Unicode whitespace outside strings/comments is a syntax error. An offset
at either code unit of CRLF belongs to the preceding line; the next line starts
after LF. EOF is at text.length, including the final empty line after a newline.
Offsets inside surrogate pairs are valid source positions, not grapheme indices.
An empty source has line 1, column 1. See [source locations](source-locations.md).

Leading zeros are decimal (`007` is 7); signs are separate unary operators.
Numeric separators, radix prefixes and decimals are unsupported. A digit run
immediately followed by an identifier character is a malformed numeric literal.
Unterminated strings/comments and unknown characters produce Syntax Errors.
The first `*/` closes a block comment; nested `/*` has no nesting effect.

## Expressions and evaluation

Precedence, low to high: `or`; `and`; `== !=`; `< <= > >=`;
`+ -`; `* /`; prefix `- not ref`; postfix call/member. Binary operators are
left associative; prefix operators right associative. Comparison/equality
chains parse left associatively and must still typecheck. Lambda bodies extend
to the end of their expression. Assignment is a statement, not an expression.

Evaluation is eager, left to right: callee then arguments, binary left then
right, constructor arguments in order, list elements in order. Assignment
resolves its target before evaluating its right side. `and`/`or` short circuit
through Core conditional expressions; both operands must statically be bool.

`int` uses signed safe integers [-9007199254740991, 9007199254740991]. Literal
overflow is a syntax diagnostic; operation overflow is a runtime diagnostic.
Division truncates toward zero; zero division is a runtime diagnostic. Arithmetic
and ordering require int, never host coercion. `not` requires bool. Equality
requires the same primitive type or related class types; objects compare by
identity. Lists, functions, references and void are not equality operands.
Strings do not support arithmetic. Conditions require bool.

## Bindings, types and scopes

`let` creates a mutable binding with an initializer; annotations constrain the
initializer, otherwise its type is inferred. Same-scope duplicates are errors;
inner shadowing is allowed. Blocks introduce scopes. Declarations are sequential,
with a function's own name available inside its body for recursion. Forward
references and mutual recursion are not in the base language. A closure cannot
see a later declaration in its surrounding block. Class names become available
for their own member types, and all member signatures are collected before bodies.

The initializer of a let is resolved before introducing its new binding, so
`let x = x` in an inner scope reads an outer x if one exists. Parameters and the
outermost function body share a scope; duplicate parameters and a body let with
the same name are errors. Catch bindings share the catch block's scope. Builtins
occupy an enclosing prelude scope and may be shadowed. Classes, functions and
variables share a declaration namespace; type position requires a class symbol
or a recognized type form. Function and class declaration bindings are read-only;
only let variables, parameters, catch bindings and generated loop bindings are
assignable. Taking ref requires such an assignable binding.

Types are int, bool, string, void, nominal classes, `List<T>`, `Ref<T>`, and
`Fn(T, ...) -> T`. Void is allowed only as a function result; bare return is
spelled `return;`. Lists are immutable and invariant; references are invariant;
function parameter types are invariant and result types covariant. Classes are
assignable to ancestors. No implicit conversion exists. Void values cannot be
stored, passed as ordinary arguments or put in lists.

## Functions and lists

Parameters require annotations. Arguments must match arity and assignability.
Named functions and lambdas are first-class closures capturing lexical bindings
by location. Each invocation allocates fresh parameter locations. Returning
closures keeps captured locations alive. Recursion binds the function location
before constructing its closure. `this` is a read-only binding in methods and
can be captured by a nested closure.

Absent a result annotation, infer the common type of return expressions; no
returns or only bare returns gives void. Mixed void/value returns are errors.
Related class results use their nearest common ancestor; other differing types
are incompatible. Recursive functions require an explicit result annotation
(including void). Non-void bodies must conservatively return/throw on every
path: return/throw terminate, both branches of an if must terminate; loops never
prove termination. Lambda result types come from their expression.

Returns in nested functions do not contribute to an enclosing result type.
All statements, including unreachable ones, are checked. For try/catch to prove
termination, both bodies must terminate conservatively. A body with only throws
infers void unless annotated otherwise. Method result inference uses dependencies
between member bodies; every method in a recursive dependency cycle requires an
explicit result annotation. Noncyclic forward member calls may infer normally.

List elements must have identical types (no automatic class widening). Empty
lists require an expected `List<T>` from an annotation, argument, or annotated
return; unconstrained `[]` is a type error. There is no indexing or mutation.
`map` is a builtin callable with a checked polymorphic signature
`Fn(T)->U, List<T> -> List<U>`; callbacks must return a non-void value. It invokes
the callback once per element, in order, and propagates a thrown value.
`print` is a builtin callable accepting one non-void value and returning void.
Polymorphic builtins may be directly called but not stored without monomorphizing;
the base language rejects taking print/map as values with a clear type error.
User functions and lambdas can be stored and passed normally.

## Control flow and sugar

If has an optional else; while checks its condition before each iteration.
`for i in range(start,end)` is ascending, start inclusive/end exclusive. Both
bounds must be int and are evaluated once in left-to-right order. Start >= end
does nothing. The loop binding is scoped to the generated block; each iteration
gets a fresh body scope, while closures over the loop binding share one location.
The body may assign the loop variable, affecting the following increment.
No break, continue, or range value is supported. Lower to declarations, while,
and assignment using generated identities that cannot collide with source names.

## References and memory

Every declaration allocates a Location. Environment: binding -> Location;
Store: Location -> RuntimeValue. `ref identifier` captures the binding's existing
location, with type Ref<T>; taking a reference to read-only `this` is forbidden.
`r := value` writes through a reference expression, whereas `r = otherRef`
replaces the value in r's own location. There is no implicit dereference and no
dereference operator in the base language. Objects share identity under assignment,
but their fields are explicit store locations. No manual deallocation is exposed.

## Objects and inheritance

Classes are top-level declarations with annotated fields (no field initializers)
and methods. Classes are nominal types, not first-class values. `new C(args)`
allocates the object and all inherited/local field locations with an internal
UNINITIALIZED sentinel, binds this, invokes the selected init, then returns the
object. Reading an uninitialized field or finishing construction with any
uninitialized field is a controlled runtime error.

Single inheritance requires a previously declared parent; cycles, including
self-inheritance, are errors. Inherited fields cannot be redeclared. Field and
method names cannot collide. Methods may be overridden with identical parameter
types and an assignable return type. `init` always returns void and is not subject
to the override signature rule: constructors are selected using the named class.
A missing init inherits the parent's init; if none exists, use an implicit
zero-argument initializer. There is no automatic parent-init call and no super
syntax. A derived explicit init must initialize inherited fields too.

Members are public. Member access may produce a bound method retaining its
receiver. Normal method lookup starts at the object's runtime class and walks
ancestors. `init` is constructor-only and cannot be called/extracted as a member.
Field writes require assignable values. Class values cannot be reassigned.

## Exceptions, output and diagnostics

Throw accepts any non-void value. Try catches the nearest language throw; catch
introduces a fresh binding of an internal opaque ThrownValue type, printable
and rethrowable but not usable in arithmetic/member access. This avoids an
untyped escape hatch or a full union system. Return propagates through try.
There is no finally. Runtime faults (division by zero, overflow, uninitialized
field) are diagnostics, not catchable throws. An uncaught throw becomes a Runtime
Error containing its formatted value. Expected failures have no host stack trace.

Diagnostics contain Syntax/Type/Runtime category, message, source span and
optional notes. Resolution failures are Type Errors. CLI invocation/I/O errors
are reported separately. Stop before execution on any static error.
Print emits one line: decimal int, lowercase bool, raw string, lists as
`[item, item]`, objects as `<ClassName object>`, functions as `<function>`, and
references as `<reference>` without exposing host addresses.

## VM subset and extension

VM supports primitive literals/operators, variables, assignments, blocks, print,
if, while, and the for/and/or sugars after lowering. Other constructs produce a
controlled unsupported-feature diagnostic, even in unreachable code. Static
checking precedes compilation. VM scope and integer semantics match the interpreter.

After mandatory features pass, add match expressions with literal patterns
(int/bool/string) and final wildcard `_`. Scrutinee is evaluated once. Patterns
must match its primitive type; duplicate patterns/unreachable arms are rejected.
Bool matches require both booleans or a wildcard; int/string require a wildcard.
All arm result types must be compatible using return-type joining. No pattern
bindings, guards or destructuring. This is planned for Milestone 21. Arms may be
separated by semicolons; a separator is required where the next pattern could
continue the preceding expression (notably a negative integer). `_` is a wildcard
only in pattern position, and an ordinary identifier elsewhere.
