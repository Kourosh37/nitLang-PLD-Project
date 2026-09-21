import { expect, test } from "bun:test";
import { lex } from "../src/frontend/lexer";
import { SourceFile } from "../src/frontend/source-file";

test("real combination fixture passes the available source-to-token pipeline", async () => {
  const file = new URL("./fixtures/valid/lexical-combination.nit", import.meta.url);
  const source = new SourceFile(file.pathname, await Bun.file(file).text());
  const result = lex(source);
  if (!result.ok) throw new Error(result.diagnostic.message);
  const kinds = result.tokens.map((token) => token.kind);
  expect(kinds).toContain("class");
  expect(kinds).toContain("lambda");
  expect(kinds).toContain("ref");
  expect(kinds).toContain("catch");
  expect(kinds.at(-1)).toBe("eof");
  for (const token of result.tokens) {
    expect(token.lexeme).toBe(source.text.slice(token.span.start.offset, token.span.end.offset));
  }
});

for (const [name, message] of [["overflow", "safe integer limit"], ["escape", "Unsupported string escape"], ["comment", "Unterminated block comment"]] as const) {
  test(`real invalid ${name} fixture produces a controlled diagnostic`, async () => {
    const file = new URL(`./fixtures/invalid/lexical-${name}.nit`, import.meta.url);
    const result = lex(new SourceFile(file.pathname, await Bun.file(file).text()));
    if (result.ok) throw new Error("Expected failure.");
    expect(result.diagnostic.category).toBe("Syntax Error");
    expect(result.diagnostic.message).toContain(message);
  });
}
