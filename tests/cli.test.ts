import { describe, expect, test } from "bun:test";
import { commands, runCli } from "../src/cli/cli";

function invoke(args: readonly string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const status = runCli(args, {
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
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
      expect(result.stdout.join("\n")).toContain("Milestone 0");
    });
  }

  for (const command of commands) {
    test(`${command} reports unavailable execution`, () => {
      const result = invoke([command, "path with spaces/program.nit"]);
      expect(result.status).toBe(2);
      expect(result.stdout).toEqual([]);
      expect(result.stderr).toEqual([
        `CLI Error: '${command}' is not implemented in Milestone 0.`,
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

  test("unknown commands and misplaced help do not report success", () => {
    for (const args of [["launch", "a.nit"], ["--help", "a.nit"]]) {
      const result = invoke(args);
      expect(result.status).toBe(2);
      expect(result.stdout).toEqual([]);
      expect(result.stderr.join("\n")).toContain("unknown command");
    }
  });
});
