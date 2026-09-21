import type { Type } from "./types";
export function isAssignable(source: Type, destination: Type): boolean {
  if (source.kind === "class" && destination.kind === "class") {
    for (let type: typeof source | null = source; type !== null; type = type.parent) if (type.id === destination.id) return true;
    return false;
  }
  if (source.kind !== destination.kind) return false;
  if (source.kind === "function" && destination.kind === "function") {
    return source.parameters.length === destination.parameters.length && source.parameters.every((p, i) => {
      const d = destination.parameters[i]; return d !== undefined && isAssignable(p, d) && isAssignable(d, p);
    }) && source.result !== null && destination.result !== null && isAssignable(source.result, destination.result);
  }
  if ((source.kind === "list" && destination.kind === "list") || (source.kind === "reference" && destination.kind === "reference")) {
    return isAssignable(source.element, destination.element) && isAssignable(destination.element, source.element);
  }
  if (source.kind === "builtin" || destination.kind === "builtin") return false;
  return true;
}
