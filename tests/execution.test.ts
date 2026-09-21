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
test("assignment, branches, while and hygienic ranges execute", () => {
  expect(execute("let total=0 for i in range(0,4) { let i=10 total=total+i } while total>38 do { total=total-1 } if total==38 then { print(total) } else { print(0) }")).toEqual(["38"]);
  expect(execute("let end=3 for i in range(0,end) { print(i) end=0 } print(end)")).toEqual(["0", "1", "2", "0"]);
  expect(execute("for i in range(5,2) { print(i) }")).toEqual([]);
  expect(() => execute('let x=1 x="bad"')).toThrow("Type Error");
  expect(() => execute("while 1 do {}")).toThrow("Type Error");
});
test("named functions recurse and validate all return paths", () => {
  expect(execute("func fact(n:int):int = { if n==0 then { return 1 } else { return n*fact(n-1) } } print(fact(6))")).toEqual(["720"]);
  expect(execute("func add(x:int,y:int) = { return x+y } print(add(2,3)) func p() = { return; } p()")).toEqual(["5"]);
  for (const source of ["func f(x:int):int = { if x>0 then { return x } }", 'func f() = { return 1; return "x" }', "func f() = { return f() }", "return 1", "func f(x:int) = {} f()", 'func f(x:int) = {} f("x")']) expect(() => execute(source)).toThrow("Type Error");
});
test("lambdas are first class and closures retain lexical locations", () => {
  expect(execute("func makeAdder(x:int) = { return lambda (y:int) -> x+y } let addFive=makeAdder(5) print(addFive(3))")).toEqual(["8"]);
  expect(execute("let a=2 let b=3 let f=lambda (x:int) -> a+b+x { let a=100 print(f(4)) }")).toEqual(["9"]);
  expect(execute("func outer(x:int) = { return lambda (y:int) -> lambda (z:int) -> x+y+z } let f=outer(1)(2) print(f(3))")).toEqual(["6"]);
  expect(execute("let x=1 let f=lambda () -> x x=7 print(f())")).toEqual(["7"]);
  expect(() => execute("let f=lambda (x:int) -> x f(true)")).toThrow("Type Error");
});
test("homogeneous lists and map are checked and evaluated in order", () => {
  expect(execute("let xs=[1,2,3] let ys=map(lambda (x:int) -> x*2,xs) print(ys)")).toEqual(["[2, 4, 6]"]);
  expect(execute("let base=3 print(map(lambda (x:int) -> x+base,[1,2])) let empty:List<int> = [] print(map(lambda (x:int)->x,empty))")).toEqual(["[4, 5]", "[]"]);
  for (const source of ["let x=[]", 'let x=[1,"x"]', "map(lambda (x:bool)->x,[1])", "map(lambda (x:int)->x,1)", "map(lambda (x:int)->x)"]) expect(() => execute(source)).toThrow("Type Error");
});
test("references alias existing locations and distinguish binding assignment", () => {
  expect(execute("let a=10 let b=ref a b:=20 print(a) print(b)")).toEqual(["20", "<reference>"]);
  expect(execute("let a=1 let c=2 let r=ref a let s=ref c r=s r:=9 print(a) print(c)")).toEqual(["1", "9"]);
  expect(execute("let a=1 { let a=2 let r=ref a r:=3 print(a) } print(a)")).toEqual(["3", "1"]);
  for (const source of ["let a=1 a:=2", 'let a=1 let r=ref a r:="x"', "ref print", "let r:Ref<int> = ref missing"]) expect(() => execute(source)).toThrow("Type Error");
});
test("classes allocate field locations, bind this, initialize and call methods", () => {
  expect(execute("class Point { let x:int let y:int func init(a:int,b:int)={this.x=a this.y=b} func move(dx:int,dy:int)={this.x=this.x+dx this.y=this.y+dy} func sum():int={return this.x+this.y} } let p=new Point(2,3) p.move(1,2) print(p.sum())")).toEqual(["8"]);
  expect(execute("class Box { let value:int func init(x:int)={this.value=x} } let a=new Box(1) let b=a b.value=9 print(a.value) print(a==b)")).toEqual(["9", "true"]);
  for (const source of ["class C { let x:int } new C()", "class C { let x:int func init()={this.x=true} }", "class C { let x:int let x:int }", "class C { func init(x:int)={} } new C()", "class C {} let c=new C() c.missing"]) expect(() => execute(source)).toThrow();
});
