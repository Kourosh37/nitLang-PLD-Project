import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function execute(args: readonly string[]) {
  const child = Bun.spawn([process.execPath, "run", "nitlang", ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [status, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { status, stdout, stderr };
}

test("package script launches the actual CLI entry point", async () => {
  const result = await execute(["--help"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("NITLang");
  expect(result.stdout).toContain("core-ast");
  expect(result.stderr).not.toContain("CLI Error:");
});

test("actual process propagates failure status without a host stack trace", async () => {
  const result = await execute(["run", "missing.nit"]);
  expect(result.status).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("cannot read");
  expect(result.stderr).not.toContain("at runCli");
});

test("actual process rejects malformed invocation", async () => {
  const result = await execute(["check"]);
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("expected 'check <file.nit>'");
});

test("ast command parses the example and emits JSON without executing print", async () => {
  const result = await execute(["ast", "examples/surface-tour.nit"]);
  expect(result.status).toBe(0);
  const output: unknown = JSON.parse(result.stdout);
  expect(output).toMatchObject({ kind: "Program", span: { sourceName: "examples/surface-tour.nit" } });
  expect(result.stderr).not.toContain("Error:");
});

test("ast command reports parser and lexer failures without host stacks", async () => {
  for (const name of ["syntax-missing-then", "lexical-escape"]) {
    const result = await execute(["ast", `tests/fixtures/invalid/${name}.nit`]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Syntax Error:");
    expect(result.stderr).not.toContain("at Parser");
    expect(result.stderr).not.toContain("at Lexer");
  }
});

test("ast command reports missing files as CLI errors", async () => {
  const result = await execute(["ast", "tests/fixtures/does-not-exist.nit"]);
  expect(result.status).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("CLI Error: cannot read");
  expect(result.stderr).not.toContain("at readFileSync");
});
