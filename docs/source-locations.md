# Source locations

Implemented in Milestone 1 in `src/frontend/source-span.ts` and `source-file.ts`.

`SourcePosition` stores a zero-based UTF-16 offset and one-based line/column.
`SourceSpan` stores a source display name and start/end positions. Ranges are
half-open: `text.slice(span.start.offset, span.end.offset)` is the original text
covered by the span. EOF and insertion points are zero-width ranges.

```ts
const source = new SourceFile("example.nit", "let x = 1\r\nprint(x)");
source.positionAt(11); // { offset: 11, line: 2, column: 1 }
source.span(4, 5);     // covers the first x
source.lineText(1);    // "let x = 1"
source.span(source.text.length); // EOF
```

LF, lone CR and CRLF end lines; CRLF is one logical newline and two code units.
The new line begins after the complete terminator. Within `a\r\nb`, offsets 1
and 2 belong to line 1 (columns 2 and 3), and offset 3 to line 2, column 1.
Empty input has one empty line; a trailing terminator creates a final empty line.
Tabs and a leading BOM each occupy one code unit. Surrogate pairs occupy two
columns; offsets may address either code unit. This is deliberate, not a claim
about terminal display width. A future renderer can expand tabs independently.

The line index costs O(n) construction and O(number of lines) space. Position
lookup costs O(log(number of lines)); span lookup performs two such queries.
Line extraction locates its bounds in O(1) and copies the returned substring.
SourceFile, positions and spans are immutable at runtime as well as readonly in
TypeScript. Offsets must be safe integers within [0, text.length]. Line numbers
must be integers in [1, lineCount]. Reversed ranges are rejected. Invalid API
arguments throw RangeError: these indicate internal misuse, not malformed source.
Any string, including invalid NITLang, can be represented for later diagnostics.

## Teaching explanation

Problem: every later phase must identify the same characters even on Windows
line endings and Unicode text. The source index centralizes those rules so the
lexer, checker and runtime do not each invent location arithmetic. Normalizing
newlines was rejected because it changes source offsets; rescanning the whole
prefix for every position was rejected because repeated lookups become quadratic.

This module does not execute code or assign types. Runtime failures and static
type errors will reuse spans copied from tokens into AST nodes. Lowering will
preserve originating source spans for generated Core constructs.

Professor question: Why is the end exclusive? Answer: adjacent tokens share a
boundary without overlapping, length is end.offset - start.offset, empty spans
represent EOF naturally, and slicing the unchanged source uses the same convention.
