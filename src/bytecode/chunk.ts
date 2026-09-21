import type { Instruction } from "./instruction";
export interface Chunk {
  readonly instructions: readonly Instruction[];
}
export function disassemble(chunk: Chunk): string {
  return chunk.instructions
    .map((instruction, offset) => {
      const prefix = offset.toString().padStart(4, "0");
      switch (instruction.op) {
        case "CONST":
          return `${prefix} CONST ${instruction.value.kind} ${JSON.stringify(instruction.value.value)}`;
        case "DEFINE":
        case "LOAD":
        case "STORE":
          return `${prefix} ${instruction.op} ${instruction.binding}`;
        case "UNARY":
        case "BINARY":
          return `${prefix} ${instruction.op} ${instruction.operator}`;
        case "JUMP":
        case "JUMP_IF_FALSE":
          return `${prefix} ${instruction.op} ${instruction.target}`;
        default:
          return `${prefix} ${instruction.op}`;
      }
    })
    .join("\n");
}
