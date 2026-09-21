import { describe, expect, test } from "bun:test";
import { commands, runCli } from "../src/cli/cli";

function invoke(args: readonly string[], source = "let x = 1") {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const status = runCli(args, {
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
    readFile: () => ({ ok: true, text: source }),
  });
  return { status, stdout, stderr };
}

describe("CLI interface", () => {
  for (const args of [[], ["--help"], ["-h"]]) {
    test(`help: ${args.join(" ") || "no arguments"}`, () => {
      const result = invoke(args);
      expect(result.status).toBe(0);
      expect(result.stderr).toEqual([]);
      expect(result.stdout.join("\n")).toContain("Usage:");
      expect(result.stdout.join("\n")).toContain("language execution is not implemented yet");
    });
  }

  for (const command of commands) {
    if (command !== "ast") test(`${command} reports unavailable execution`, () => {
      const result = invoke([command, "path with spaces/program.nit"]);
      expect(result.status).toBe(2);
      expect(result.stdout).toEqual([]);
      expect(result.stderr).toEqual([
        `CLI Error: '${command}' is not implemented yet.`,
      ]);
    });

    test(`${command} validates arguments`, () => {
      for (const args of [[command], [command, ""], [command, "   "], [command, "a.nit", "b.nit"]]) {
        const result = invoke(args);
        expect(result.status).toBe(2);
        expect(result.stdout).toEqual([]);
        expect(result.stderr.join("\n")).toContain("expected");
      }
    });
  }

  test("ast prints a real Surface AST for a path containing spaces", () => {
    const result = invoke(["ast", "path with spaces/program.nit"]);
    expect(result.status).toBe(0);
    expect(result.stderr).toEqual([]);
    const output: unknown = JSON.parse(result.stdout.join("\n"));
    expect(output).toMatchObject({ kind: "Program", body: [{ kind: "LetDeclaration" }], span: { sourceName: "path with spaces/program.nit" } });
  });

  test("ast reports source diagnostics with failure status and no partial AST", () => {
    for (const source of ["let x =", "@"]) {
      const result = invoke(["ast", "bad.nit"], source);
      expect(result.status).toBe(1);
      expect(result.stdout).toEqual([]);
      expect(result.stderr.join("\n")).toContain("bad.nit:1:");
      expect(result.stderr.join("\n")).toContain("Syntax Error:");
    }
  });

  test("ast file errors remain distinct from syntax errors", () => {
    const errors: string[] = [];
    const status = runCli(["ast", "missing.nit"], {
      readFile: () => ({ ok: false, message: "File not found." }),
      stdout: () => { throw new Error("Unexpected output."); },
      stderr: (message) => errors.push(message),
    });
    expect(status).toBe(2);
    expect(errors).toEqual(['CLI Error: cannot read "missing.nit": File not found.']);
  });

  test("unknown commands and misplaced help do not report success", () => {
    for (const args of [["launch", "a.nit"], ["--help", "a.nit"]]) {
      const result = invoke(args);
      expect(result.status).toBe(2);
      expect(result.stdout).toEqual([]);
      expect(result.stderr.join("\n")).toContain("unknown command");
    }
  });
});
