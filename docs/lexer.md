# Lexer and lexical diagnostics

Implemented in Milestone 2. The hand-written scanner consumes a SourceFile;
it neither parses nor executes code. No compiler-generation dependency is used.

```ts
import { lex } from "../src/frontend/lexer";
import { SourceFile } from "../src/frontend/source-file";
import { formatDiagnostic } from "../src/diagnostics/diagnostic";

const result = lex(new SourceFile("example.nit", "let age:int = 20"));
if (result.ok) {
  console.log(result.tokens);
} else {
  console.error(formatDiagnostic(result.diagnostic));
}
```

This example shows the lexer API; it is not a language execution command.
Since M3, ast composes lexing and parsing; other CLI phases remain unavailable.

## Token contract

Token is a discriminated union. Every variant has kind, exact original lexeme
and SourceSpan. Integer tokens additionally have a numeric value; string-literal
tokens have a decoded string value. `int` and `string` are type keywords distinct
from literals. Booleans are keyword tokens; the parser will construct their AST
values. Identifiers retain their spelling in lexeme. EOF has an empty lexeme and
zero-width span at source length. Successful output contains exactly one EOF.

Keyword and punctuation kinds use their actual source spelling, making future
parser expectations readable. The union restricts valid spellings at compile
time. Keyword lookup uses Map, so names such as constructor and __proto__ cannot
accidentally resolve to inherited host properties. Returned tokens and arrays
are frozen. Each lex call owns a fresh private cursor and token buffer.

## Scanning rules

Scan trivia, identifiers, numbers, strings, then punctuation. Match two-character
operators before one-character operators. Recognize comment delimiters before
division tokens. A leading BOM is skipped without changing offsets. Identifier
classification uses explicit ASCII ranges; whole words are scanned before
keyword lookup. Comments separate adjacent tokens; block comments do not nest.

Decimal digit runs become safe integers only after checking malformed identifier
suffixes. Unary minus remains a separate token. `1.5` lexes as integer, dot,
integer: decimal expression rejection belongs to parsing, since dot is a valid
member token. Likewise the lexer does not balance delimiters or reject type-invalid
expressions. Long integer text that converts to infinity fails the safe-integer
check. Strings decode only the five specified escapes and retain their original
quoted lexeme for diagnostics. Unicode content is preserved verbatim.

Scanning advances monotonically without recursive calls. Character processing is
O(n); creating t token spans adds O(t log L) for SourceFile's L-line index. The
source index and output consume O(n + t) space, including decoded strings.

## Failure contract

LexResult is either `{ ok: true, tokens }` or `{ ok: false, diagnostic }`.
No partial token stream is exposed on failure. The lexer stops at the first
error; recovery and multiple simultaneous diagnostics are not implemented.

Diagnostic includes category, message, SourceSpan and optional notes. Categories
are Syntax Error, Type Error and Runtime Error; the lexer emits only Syntax Error.
DiagnosticError is controlled internal unwinding caught at the lex boundary.
Unexpected host exceptions are rethrown as implementation bugs, not mislabeled
as user syntax errors. formatDiagnostic prints source:line:column, category,
message and optional notes, never a host stack trace.

Unknown characters cover their complete code point (one or two UTF-16 units).
Malformed numbers cover the full adjoining identifier suffix. Unterminated
strings/comments extend from the opening delimiter to EOF. Raw-newline string
errors cover the opening quote through the content before the newline. Invalid
escapes cover backslash and the following code unit; an escape ending at EOF
covers the backslash. These ranges always index unchanged source text.

## Teaching notes

Problem: later phases need a reliable vocabulary and exact source locations.
A hand-written scanner keeps those rules visible and independently testable.
A single whole-language regular expression or execution during scanning was
rejected because neither provides a clear phase boundary for the assignment.

Runtime behavior and static types are not decided here. Literal decoding is
lexical work; arithmetic, name lookup and type compatibility happen later.

Professor question: Why can `"hello" - true` pass the lexer? Answer: every token
is individually valid. Parsing establishes the expression structure and static
checking rejects the operand types before execution. Rejecting it in the lexer
would mix responsibilities and impede source-local diagnostics.

Tests include full vocabulary, adjacency/longest match, all supported escapes,
numeric boundaries, malformed input, source spans, state isolation, and actual
.nit fixtures. Fixtures currently validate the source-to-token portion only.
