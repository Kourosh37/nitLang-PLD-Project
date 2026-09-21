import { expect, test } from "bun:test";
import { compile } from "../src/bytecode/compiler";
import { disassemble } from "../src/bytecode/chunk";
import { check } from "../src/pipeline";
import { SourceFile } from "../src/frontend/source-file";
function code(source: string) { const result = check(new SourceFile("vm.nit", source)); if (!result.ok) throw new Error(result.diagnostic.message); return compile(result.value); }
test("compiler emits readable stack code and patched branch targets", () => {
  const chunk = code("let x=0 while x<2 do { if x==0 then { print(x) } else { print(9) } x=x+1 }");
  expect(chunk.instructions.at(-1)?.op).toBe("HALT");
  for (const instruction of chunk.instructions) if (instruction.op === "JUMP" || instruction.op === "JUMP_IF_FALSE") {
    expect(instruction.target).toBeGreaterThanOrEqual(0); expect(instruction.target).toBeLessThanOrEqual(chunk.instructions.length);
  }
  expect(disassemble(chunk)).toContain("JUMP_IF_FALSE"); expect(disassemble(chunk)).toContain("BINARY +");
});
test("bytecode rejects unsupported checked constructs before VM execution", () => {
  for (const source of ["func f()={} f()", "let x=[1]", "class C {} new C()"]) expect(() => code(source)).toThrow("bytecode backend does not support");
});
