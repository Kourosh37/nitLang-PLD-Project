/** Offsets and columns count UTF-16 code units; lines and columns start at 1. */
export interface SourcePosition {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

/** Half-open [start, end) range. Empty ranges represent EOF or insertion points. */
export interface SourceSpan {
  readonly sourceName: string;
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}
