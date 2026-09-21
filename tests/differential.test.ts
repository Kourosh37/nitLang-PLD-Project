import { expect, test } from "bun:test";
import { SourceFile } from "../src/frontend/source-file";
import { run, runVm } from "../src/pipeline";
function outputs(text: string) {
  const tree: string[] = [], vm: string[] = [];
  const source = new SourceFile("differential.nit", text);
  const a = run(source, (s) => tree.push(s)), b = runVm(source, (s) => vm.push(s));
  if (!a.ok || !b.ok) throw new Error(`Unexpected differential rejection: ${!a.ok ? a.diagnostic.message : !b.ok ? b.diagnostic.message : ""}`);
  return { tree, vm };
}
for (const [name, source] of [
  ["arithmetic", "let x=2 print(x+3*4) print((x+3)*4)"],
  ["shadowing", "let x=1 { let x=2 print(x) } print(x)"],
  ["assignment-loop", "let n=4 let r=1 while n>0 do { r=r*n n=n-1 } print(r)"],
  ["branches", 'if false then { print("bad") } else { print("ok") }'],
  ["short-circuit", "print(false and (1/0==0)) print(true or (1/0==0))"],
  ["for-sugar", "for i in range(1,4) { print(i) }"],
] as const) test(`interpreter and VM agree: ${name}`, () => { const result = outputs(source); expect(result.vm).toEqual(result.tree); });
test("example loop is identical on both backends", async () => {
  const text = await Bun.file(new URL("../examples/loop.nit", import.meta.url)).text();
  expect(outputs(text)).toEqual({ tree: ["7"], vm: ["7"] });
});
