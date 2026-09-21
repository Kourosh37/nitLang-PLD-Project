import { expect, test } from "bun:test";
import { execute } from "./execution.test";
test("formal-semantics arithmetic and closure examples match implementation", () => {
  expect(execute("let x=4 print(x+3)")).toEqual(["7"]);
  expect(execute("func make(x:int)={return lambda (y:int)->x+y} print(make(4)(3))")).toEqual(["7"]);
});
