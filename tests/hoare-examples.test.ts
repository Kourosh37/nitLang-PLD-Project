import { expect, test } from "bun:test";
import { execute } from "./execution.test";
test("Hoare assignment example reaches its postcondition", () => {
  expect(execute("let x=4 x=x+3 print(x)")).toEqual(["7"]);
});
test("Hoare factorial loop reaches its postcondition", () => {
  expect(
    execute("let n=5 let result=1 while n>0 do { result=result*n n=n-1 } print(result) print(n)"),
  ).toEqual(["120", "0"]);
});
