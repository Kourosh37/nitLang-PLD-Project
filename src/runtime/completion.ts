import type { SourceSpan } from "../frontend/source-span";
import type { RuntimeValue } from "./values";
/** Only language control flow uses this signal; runtime faults use DiagnosticError. */
export class ControlSignal extends Error {
  constructor(readonly kind: "return" | "throw", readonly value: RuntimeValue, readonly span: SourceSpan) {
    super(kind); this.name = "ControlSignal";
  }
}
