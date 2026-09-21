import type { SourcePosition, SourceSpan } from "./source-span";

/** Immutable source text with a reusable line index for tokens and diagnostics. */
export class SourceFile {
  readonly #lineStarts: readonly number[];

  constructor(
    public readonly name: string,
    public readonly text: string,
  ) {
    const starts = [0];
    for (let offset = 0; offset < text.length; offset += 1) {
      const character = text[offset];
      if (character === "\r") {
        if (text[offset + 1] === "\n") offset += 1;
        starts.push(offset + 1);
      } else if (character === "\n") {
        starts.push(offset + 1);
      }
    }
    this.#lineStarts = Object.freeze(starts);
    Object.freeze(this);
  }

  get lineCount(): number {
    return this.#lineStarts.length;
  }

  positionAt(offset: number): SourcePosition {
    this.validateOffset(offset);
    // Upper-bound search: EOF after a newline belongs to the final empty line.
    let low = 0;
    let high = this.#lineStarts.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.lineStart(middle) <= offset) low = middle + 1;
      else high = middle;
    }
    const lineIndex = low - 1;
    return Object.freeze({
      offset,
      line: lineIndex + 1,
      column: offset - this.lineStart(lineIndex) + 1,
    });
  }

  span(startOffset: number, endOffset: number = startOffset): SourceSpan {
    const start = this.positionAt(startOffset);
    const end = this.positionAt(endOffset);
    if (endOffset < startOffset) {
      throw new RangeError("Source span end must not precede its start.");
    }
    return Object.freeze({ sourceName: this.name, start, end });
  }

  /** Returns a one-based line without its CR, LF or CRLF terminator. */
  lineText(line: number): string {
    if (!Number.isSafeInteger(line) || line < 1 || line > this.lineCount) {
      throw new RangeError(`Source line must be an integer from 1 to ${this.lineCount}.`);
    }
    const start = this.lineStart(line - 1);
    let end = this.#lineStarts[line] ?? this.text.length;
    if (end > start && this.text[end - 1] === "\n") end -= 1;
    if (end > start && this.text[end - 1] === "\r") end -= 1;
    return this.text.slice(start, end);
  }

  private validateOffset(offset: number): void {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > this.text.length) {
      throw new RangeError(`Source offset must be an integer from 0 to ${this.text.length}.`);
    }
  }

  private lineStart(index: number): number {
    const start = this.#lineStarts[index];
    if (start === undefined) throw new RangeError("Invalid source line index.");
    return start;
  }
}
