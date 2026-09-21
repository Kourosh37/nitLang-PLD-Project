import { expect, test } from "bun:test";
import { parse } from "../src/frontend/parser";
import { SourceFile } from "../src/frontend/source-file";
import { desugar } from "../src/desugar/desugar";
function lower(text: string) {
  const result = parse(new SourceFile("sugar.nit", text));
  if (!result.ok) throw new Error(result.diagnostic.message);
  return desugar(result.program);
}
test("logical sugar becomes lazy conditional expression", () => {
  expect(lower("a and b or c").body).toMatchObject([
    {
      expression: {
        kind: "ConditionalExpression",
        condition: {
          kind: "ConditionalExpression",
          condition: { name: "a" },
          consequent: { name: "b" },
          alternative: { value: false },
        },
        consequent: { value: true },
        alternative: { name: "c" },
      },
    },
  ]);
});
test("range has once-only boundaries and hygienic names with a separate body scope", () => {
  const core = lower("for i in range(start(),end()) { let i = 9; } for j in range(0,2) {}");
  expect(core.body).toHaveLength(2);
  expect(core.body[0]).toMatchObject({
    kind: "BlockStatement",
    body: [
      {
        kind: "LetDeclaration",
        name: { name: "@rangeStart0" },
        initializer: { kind: "CallExpression" },
      },
      { kind: "LetDeclaration", name: { name: "@rangeEnd1" } },
      { name: { name: "i" } },
      {
        kind: "WhileStatement",
        body: {
          body: [
            { kind: "BlockStatement" },
            { kind: "AssignmentStatement", target: { name: "i" } },
          ],
        },
      },
    ],
  });
  const second = core.body[1];
  if (second?.kind !== "BlockStatement") throw new Error("Expected lowered range block.");
  expect(second.body[0]).toMatchObject({ name: { name: "@rangeStart2" } });
});
test("nested function and class sugars are fully removed", () => {
  const core = lower("class C { func f() = { for i in range(0,1) { print((true and false)); } } }");
  const json = JSON.stringify(core);
  for (const removed of ["ForStatement", "GroupExpression", "EmptyStatement", '"operator":"and"'])
    expect(json).not.toContain(removed);
});
