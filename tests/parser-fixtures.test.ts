import { expect, test } from "bun:test";
import { parse } from "../src/frontend/parser";
import { SourceFile } from "../src/frontend/source-file";

for (const path of ["./fixtures/valid/lexical-combination.nit", "../examples/surface-tour.nit"]) {
  test(`actual source parses: ${path}`, async () => {
    const file = new URL(path, import.meta.url);
    const result = parse(new SourceFile(path, await Bun.file(file).text()));
    if (!result.ok) throw new Error(result.diagnostic.message);
    expect(result.program.kind).toBe("Program");
    expect(result.program.body.length).toBeGreaterThan(5);
    expect(result.program.body.some((node) => node.kind === "ClassDeclaration")).toBe(true);
  });
}

for (const name of ["syntax-missing-then", "syntax-bad-target"]) {
  test(`actual invalid source is rejected: ${name}`, async () => {
    const file = new URL(`./fixtures/invalid/${name}.nit`, import.meta.url);
    const result = parse(new SourceFile(name, await Bun.file(file).text()));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected syntax diagnostic.");
    expect(result.diagnostic.category).toBe("Syntax Error");
  });
}
