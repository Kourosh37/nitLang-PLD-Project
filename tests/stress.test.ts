import { expect, test } from "bun:test";
import { SourceFile } from "../src/frontend/source-file";
import { check, run, runVm } from "../src/pipeline";

function output(text: string): string[] {
  const lines: string[] = [];
  const result = run(new SourceFile("stress.nit", text), (line) => lines.push(line));
  if (!result.ok) throw new Error(`${result.diagnostic.category}: ${result.diagnostic.message}`);
  return lines;
}

test("full language stress example combines all tree-interpreter feature families", async () => {
  const source = await Bun.file(new URL("../examples/full-language.nit", import.meta.url)).text();
  expect(output(source)).toEqual(["derived", "120", "[11, 12, 13]", "100", "6", "0", "1", "two", "true"]);
});

test("changed names values and nesting preserve semantics", () => {
  const source = 'let alpha=3 func maker(delta:int)={return lambda (item:int)->alpha+delta+item} let operation=maker(4) { let alpha=999 print(operation(5)) } class Root { let data:int func init(v:int)={this.data=v} func read():int={return this.data} } class Leaf extends Root {} let instance:Root=new Leaf(8) print(instance.read())';
  expect(output(source)).toEqual(["12", "8"]);
});

test("exceptions from inherited methods inside loops reach lexical catches", () => {
  const source = 'class A { func act(x:int):int={if x==1 then {throw "hit"} return x} } class B extends A {} let value:A=new B() for index in range(0,3) { try { print(value.act(index)) } catch issue { print(issue) } }';
  expect(output(source)).toEqual(["0", "hit", "2"]);
});

test("large reasonable recursion and loops complete", () => {
  expect(output("func sum(n:int):int={if n==0 then {return 0}else{return n+sum(n-1)}} print(sum(100)) let i=0 while i<1000 do {i=i+1} print(i)")).toEqual(["5050", "1000"]);
});

test("representative invalid programs fail in their correct phase before output", () => {
  for (const [source, category] of [
    ["let x = @", "Syntax Error"],
    ['print("before") let x:int="wrong"', "Type Error"],
    ["print(1/0)", "Runtime Error"],
    ['throw "no handler"', "Runtime Error"],
  ] as const) {
    const lines: string[] = [];
    const result = run(new SourceFile("invalid.nit", source), (line) => lines.push(line));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.category).toBe(category);
    if (category !== "Runtime Error") expect(lines).toEqual([]);
  }
});

test("VM stress subset agrees with tree execution", () => {
  const source = "let total=0 for number in range(0,20) { if number>=10 and number!=15 then {total=total+number} } print(total)";
  const tree: string[] = [], vm: string[] = [];
  expect(run(new SourceFile("both.nit", source), (line) => tree.push(line)).ok).toBe(true);
  expect(runVm(new SourceFile("both.nit", source), (line) => vm.push(line)).ok).toBe(true);
  expect(vm).toEqual(tree);
  expect(vm).toEqual(["130"]);
});

test("check accepts the complete example without executing it", async () => {
  const source = await Bun.file(new URL("../examples/full-language.nit", import.meta.url)).text();
  expect(check(new SourceFile("full-language.nit", source)).ok).toBe(true);
});
