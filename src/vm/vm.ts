import type { Chunk } from "../bytecode/chunk";
import { DiagnosticError } from "../diagnostics/diagnostic";
import { applyBinary, applyUnary, formatPrimitive, requireBoolean } from "../runtime/primitive-operations";
import type { RuntimeValue } from "../runtime/values";
export class VirtualMachine {
  private readonly stack: RuntimeValue[] = [];
  private readonly scopes: Map<number, RuntimeValue>[] = [new Map()];
  private ip = 0;
  constructor(readonly chunk: Chunk, readonly output: (text: string) => void) {}
  private pop(): RuntimeValue { const value = this.stack.pop(); if (value === undefined) throw new Error("Bytecode stack underflow."); return value; }
  private lookup(binding: number): RuntimeValue | undefined { for (let i = this.scopes.length - 1; i >= 0; i -= 1) { const value = this.scopes[i]?.get(binding); if (value !== undefined) return value; } }
  run(): void {
    while (true) {
      const instruction = this.chunk.instructions[this.ip]; if (instruction === undefined) throw new Error("Instruction pointer escaped chunk.");
      this.ip += 1;
      switch (instruction.op) {
        case "CONST": this.stack.push(instruction.value); break;
        case "DEFINE": this.scopes.at(-1)?.set(instruction.binding, this.pop()); break;
        case "LOAD": { const value = this.lookup(instruction.binding); if (value === undefined) throw new DiagnosticError({ category: "Runtime Error", message: "Undefined VM binding.", span: instruction.span }); this.stack.push(value); break; }
        case "STORE": {
          const value = this.pop(); let found = false;
          for (let i = this.scopes.length - 1; i >= 0; i -= 1) if (this.scopes[i]?.has(instruction.binding)) { this.scopes[i]?.set(instruction.binding, value); found = true; break; }
          if (!found) throw new DiagnosticError({ category: "Runtime Error", message: "Undefined VM assignment target.", span: instruction.span }); break;
        }
        case "UNARY": this.stack.push(applyUnary(instruction.operator, this.pop(), instruction.span)); break;
        case "BINARY": { const right = this.pop(), left = this.pop(); this.stack.push(applyBinary(instruction.operator, left, right, instruction.span)); break; }
        case "POP": this.pop(); break;
        case "PRINT": this.output(formatPrimitive(this.pop(), instruction.span)); break;
        case "JUMP": this.ip = instruction.target; break;
        case "JUMP_IF_FALSE": if (!requireBoolean(this.pop(), instruction.span)) this.ip = instruction.target; break;
        case "ENTER_SCOPE": this.scopes.push(new Map()); break;
        case "EXIT_SCOPE": if (this.scopes.length === 1) throw new Error("Cannot exit VM root scope."); else this.scopes.pop(); break;
        case "HALT": if (this.stack.length !== 0 || this.scopes.length !== 1) throw new Error("Unbalanced bytecode at HALT."); else return;
      }
    }
  }
}
