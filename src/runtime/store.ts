import { DiagnosticError } from "../diagnostics/diagnostic";
import type { SourceSpan } from "../frontend/source-span";
import { Location } from "./location";
import type { RuntimeValue } from "./values";

export const UNINITIALIZED = Symbol("uninitialized");
export class Store {
  private readonly cells = new Map<Location, RuntimeValue | typeof UNINITIALIZED>();
  allocate(value: RuntimeValue | typeof UNINITIALIZED = UNINITIALIZED): Location {
    const location = new Location(this.cells.size);
    this.cells.set(location, value);
    return location;
  }
  read(location: Location, span: SourceSpan): RuntimeValue {
    const value = this.cells.get(location);
    if (value === undefined) this.fail("Unknown storage location.", span);
    if (value === UNINITIALIZED) this.fail("Read of uninitialized storage.", span);
    return value;
  }
  write(location: Location, value: RuntimeValue, span: SourceSpan): void {
    if (!this.cells.has(location)) this.fail("Unknown storage location.", span);
    this.cells.set(location, value);
  }
  private fail(message: string, span: SourceSpan): never {
    throw new DiagnosticError({ category: "Runtime Error", message, span });
  }
}
