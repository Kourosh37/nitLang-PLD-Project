import { describe, expect, test } from "bun:test";
import { SourceFile } from "../src/frontend/source-file";

describe("source positions", () => {
  test("empty input has one line and a zero-width EOF span", () => {
    const source = new SourceFile("empty.nit", "");
    expect(source.lineCount).toBe(1);
    expect(source.lineText(1)).toBe("");
    expect(source.span(0)).toEqual({
      sourceName: "empty.nit",
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 0, line: 1, column: 1 },
    });
  });

  test("every offset in mixed line endings has a defined position", () => {
    const source = new SourceFile("mixed.nit", "a\r\nb\rc\n");
    const coordinates = [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [3, 2], [4, 1]] as const;
    coordinates.forEach(([line, column], offset) => {
      expect(source.positionAt(offset)).toEqual({ offset, line, column });
    });
    expect(source.lineCount).toBe(4);
    expect([1, 2, 3, 4].map((line) => source.lineText(line))).toEqual(["a", "b", "c", ""]);
  });

  for (const ending of ["\n", "\r", "\r\n"]) {
    test(`consecutive ${JSON.stringify(ending)} terminators preserve empty lines`, () => {
      const source = new SourceFile("lines.nit", `first${ending}${ending}last${ending}`);
      expect(source.lineCount).toBe(4);
      expect([1, 2, 3, 4].map((line) => source.lineText(line))).toEqual(["first", "", "last", ""]);
      expect(source.positionAt(source.text.length)).toEqual({ offset: source.text.length, line: 4, column: 1 });
    });
  }

  test("columns count UTF-16, including tabs, BOM, and surrogate halves", () => {
    const source = new SourceFile("unicode.nit", "\uFEFF\t\u0633\u{1F600}\n\u0628");
    for (let offset = 0; offset <= 5; offset += 1) {
      expect(source.positionAt(offset)).toEqual({ offset, line: 1, column: offset + 1 });
    }
    expect(source.positionAt(6)).toEqual({ offset: 6, line: 2, column: 1 });
    expect(source.positionAt(7)).toEqual({ offset: 7, line: 2, column: 2 });
    expect(source.lineText(1)).toBe("\uFEFF\t\u0633\u{1F600}");
  });

  test("line lookup supports a large source and backward queries", () => {
    const source = new SourceFile("large.nit", "abc\n".repeat(10_000) + "end");
    for (const index of [10_000, 5_000, 1, 0, 9_999]) {
      expect(source.positionAt(index * 4)).toEqual({ offset: index * 4, line: index + 1, column: 1 });
    }
    expect(source.lineText(10_001)).toBe("end");
    expect(source.positionAt(source.text.length).column).toBe(4);
  });
});

describe("source spans", () => {
  test("token, multiline and EOF spans slice unchanged source", () => {
    const source = new SourceFile("example.nit", "let x = 1\r\nprint(x)");
    expect(source.positionAt(11)).toEqual({ offset: 11, line: 2, column: 1 });
    for (const [start, end] of [[4, 5], [0, 9], [4, 16], [0, source.text.length]] as const) {
      const span = source.span(start, end);
      expect(span.sourceName).toBe("example.nit");
      expect(span.start).toEqual(source.positionAt(start));
      expect(span.end).toEqual(source.positionAt(end));
      expect(source.text.slice(span.start.offset, span.end.offset)).toBe(source.text.slice(start, end));
    }
    const eof = source.span(source.text.length);
    expect(eof.start).toEqual(eof.end);
    expect(source.text.slice(eof.start.offset, eof.end.offset)).toBe("");
    expect(source.text.slice(source.span(4, 5).start.offset, 5)).toBe("x");
  });

  test("source and returned location data are immutable", () => {
    const source = new SourceFile("test.nit", "abc");
    const span = source.span(0, 3);
    for (const value of [source, span, span.start, span.end, source.positionAt(1)]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Reflect.set(span.start, "offset", 99)).toBe(false);
    expect(span.start.offset).toBe(0);
  });

  test("invalid offsets and reversed spans are rejected", () => {
    const source = new SourceFile("test.nit", "abc");
    for (const offset of [-1, 4, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => source.positionAt(offset)).toThrow(RangeError);
      expect(() => source.span(offset, 3)).toThrow(RangeError);
      expect(() => source.span(0, offset)).toThrow(RangeError);
    }
    expect(() => source.span(2, 1)).toThrow(RangeError);
  });

  test("invalid one-based line numbers are rejected", () => {
    const source = new SourceFile("test.nit", "abc");
    for (const line of [0, -1, 2, 1.5, NaN, Infinity]) {
      expect(() => source.lineText(line)).toThrow(RangeError);
    }
  });
});
