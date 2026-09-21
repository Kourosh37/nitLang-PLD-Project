import { formatDiagnostic } from "../diagnostics/diagnostic";
import { parse } from "../frontend/parser";
import { SourceFile } from "../frontend/source-file";
import { desugar } from "../desugar/desugar";
import { bytecode, check, run, runVm } from "../pipeline";
import { disassemble } from "../bytecode/chunk";

export const commands = ["run", "check", "ast", "core-ast", "bytecode", "vm"] as const;
export type Command = (typeof commands)[number];

export interface CliIO {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
  readonly readFile: (
    path: string,
  ) =>
    { readonly ok: true; readonly text: string } | { readonly ok: false; readonly message: string };
}

export const help = `NITLang - educational programming language

Usage: bun run nitlang <command> <file.nit>

Commands:
  run        Execute using the tree-walk interpreter
  check      Perform static checking
  ast        Show Surface AST
  core-ast   Show desugared Core AST
  bytecode   Disassemble bytecode for the supported subset
  vm         Execute using the bytecode VM

Options:
  -h, --help Show this help

Commands run, check, ast and core-ast are available for the implemented subset.`;

function isCommand(value: string): value is Command {
  return commands.some((command) => command === value);
}

export function runCli(args: readonly string[], io: CliIO): number {
  const [command, file] = args;
  if (args.length === 0 || (args.length === 1 && (command === "--help" || command === "-h"))) {
    io.stdout(help);
    return 0;
  }
  if (command === undefined || !isCommand(command)) {
    io.stderr(`CLI Error: unknown command '${command ?? ""}'. Use --help.`);
    return 2;
  }
  if (args.length !== 2 || file === undefined || file.trim() === "") {
    io.stderr(`CLI Error: expected '${command} <file.nit>'. Use --help.`);
    return 2;
  }
  if (
    command === "ast" ||
    command === "core-ast" ||
    command === "check" ||
    command === "run" ||
    command === "bytecode" ||
    command === "vm"
  ) {
    const input = io.readFile(file);
    if (!input.ok) {
      io.stderr(`CLI Error: cannot read ${JSON.stringify(file)}: ${input.message}`);
      return 2;
    }
    const source = new SourceFile(file, input.text);
    if (command === "check" || command === "run" || command === "bytecode" || command === "vm") {
      const result =
        command === "check"
          ? check(source)
          : command === "run"
            ? run(source, io.stdout)
            : command === "bytecode"
              ? bytecode(source)
              : runVm(source, io.stdout);
      if (!result.ok) {
        io.stderr(formatDiagnostic(result.diagnostic, source));
        return 1;
      }
      if (command === "bytecode")
        io.stdout(disassemble(result.value as import("../bytecode/chunk").Chunk));
      return 0;
    }
    const result = parse(source);
    if (!result.ok) {
      io.stderr(formatDiagnostic(result.diagnostic, source));
      return 1;
    }
    io.stdout(
      JSON.stringify(command === "core-ast" ? desugar(result.program) : result.program, null, 2),
    );
    return 0;
  }
  io.stderr(`CLI Error: '${command}' is not implemented yet.`);
  return 2;
}
