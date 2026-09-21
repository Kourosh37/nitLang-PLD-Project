import { expect, test } from "bun:test";
import { SourceFile } from "../src/frontend/source-file";
import { run, check } from "../src/pipeline";
export function execute(text: string): string[] {
  const output: string[] = [];
  const result = run(new SourceFile("test.nit", text), (line) => output.push(line));
  if (!result.ok) throw new Error(`${result.diagnostic.category}: ${result.diagnostic.message}`);
  return output;
}
test("checked primitive source executes with lexical shadowing", () => {
  expect(execute('let x=10 { let x=x+2 print(x) } print(x) print(7/3) print("text")')).toEqual(["12", "10", "2", "text"]);
});
test("static errors prevent every side effect", () => {
  for (const source of ['print(1) let x:int="bad"', 'print(1) print(missing)', 'let x=1 let x=2', 'print(1) if 1 then {}']) {
    const output: string[] = [];
    const result = run(new SourceFile("bad.nit", source), (s) => output.push(s));
    expect(result.ok).toBe(false); expect(output).toEqual([]);
    if (!result.ok) expect(result.diagnostic.category).toBe("Type Error");
  }
});
test("check never evaluates runtime errors", () => {
  expect(check(new SourceFile("zero.nit", "print(1/0)")).ok).toBe(true);
  expect(() => execute("print(1/0)")).toThrow("Division by zero");
  expect(execute("print(false and (1/0 == 0)) print(true or (1/0 == 0))")).toEqual(["false", "true"]);
});
