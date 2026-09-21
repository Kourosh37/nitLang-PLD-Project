import { DiagnosticError } from "../../diagnostics/diagnostic";
import type { SourceSpan } from "../../frontend/source-span";
export interface Binding { readonly id: number; readonly name: string; readonly mutable: boolean }
export class SymbolTable {
  private readonly names = new Map<string, Binding>();
  constructor(readonly parent: SymbolTable | null = null) {}
  define(binding: Binding, span: SourceSpan): void {
    if (this.names.has(binding.name)) throw new DiagnosticError({ category: "Type Error", message: `Duplicate binding '${binding.name}'.`, span });
    this.names.set(binding.name, binding);
  }
  lookup(name: string, span: SourceSpan): Binding {
    const binding = this.names.get(name);
    if (binding !== undefined) return binding;
    if (this.parent !== null) return this.parent.lookup(name, span);
    throw new DiagnosticError({ category: "Type Error", message: `Undefined identifier '${name}'.`, span });
  }
}
