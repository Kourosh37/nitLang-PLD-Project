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
  expect(result.stderr).toContain("not implemented in Milestone 0");
  expect(result.stderr).not.toContain("at runCli");
});

test("actual process rejects malformed invocation", async () => {
  const result = await execute(["check"]);
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("expected 'check <file.nit>'");
});
