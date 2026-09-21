export const commands = ["run", "check", "ast", "core-ast", "bytecode", "vm"] as const;
export type Command = (typeof commands)[number];

export interface CliIO {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
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

Command interface only; language execution is not implemented yet.`;

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
  io.stderr(`CLI Error: '${command}' is not implemented yet.`);
  return 2;
}
