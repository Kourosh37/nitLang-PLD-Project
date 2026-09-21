import { DiagnosticError } from "../diagnostics/diagnostic";
import type { SourceSpan } from "../frontend/source-span";
import type { Location } from "./location";

/** Numeric IDs come from static resolution, not source spelling. */
export class Environment {
  private readonly bindings = new Map<number, Location>();
  constructor(public readonly parent: Environment | null = null) {}
  define(binding: number, location: Location, span: SourceSpan): void {
    if (this.bindings.has(binding)) throw new DiagnosticError({ category: "Runtime Error", message: "Binding already defined.", span });
    this.bindings.set(binding, location);
  }
  lookup(binding: number, span: SourceSpan): Location {
    for (let environment: Environment | null = this; environment !== null; environment = environment.parent) {
      const location = environment.bindings.get(binding);
      if (location !== undefined) return location;
    }
    throw new DiagnosticError({ category: "Runtime Error", message: "Undefined runtime binding.", span });
  }
}
