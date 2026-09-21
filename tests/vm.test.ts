import { expect, test } from "bun:test";
import { SourceFile } from "../src/frontend/source-file";
import { runVm } from "../src/pipeline";
function vm(source: string): string[] {
  const output: string[] = [];
  const result = runVm(new SourceFile("vm.nit", source), (s) => output.push(s));
  if (!result.ok) throw new Error(`${result.diagnostic.category}: ${result.diagnostic.message}`);
  return output;
}
test("stack VM executes literals variables assignment conditions loops and print", () => {
  expect(vm('let x=0 while x<3 do { if x!=1 then { print(x) } x=x+1 } print("done")')).toEqual([
    "0",
    "2",
    "done",
  ]);
  expect(
    vm("print(false and (1/0==0)) print(true or (1/0==0)) for i in range(0,3) { print(i) }"),
  ).toEqual(["false", "true", "0", "1", "2"]);
});
test("VM reports shared arithmetic faults and backend exclusions", () => {
  expect(() => vm("print(1/0)")).toThrow("Division by zero");
  expect(() => vm("func f()={} f()")).toThrow("bytecode backend does not support");
});
