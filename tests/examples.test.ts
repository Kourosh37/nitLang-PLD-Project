import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SourceFile } from "../src/frontend/source-file";
import { run, runVm } from "../src/pipeline";

interface Example {
  readonly file: string;
  readonly output: string[];
  readonly vm?: boolean;
}

const examples: readonly Example[] = [
  {
    file: "01-basics.nit",
    output: ["42", "hello\nNITLang", "true", "21", "42"],
  },
  { file: "02-control-flow.nit", output: ["15", "true"], vm: true },
  { file: "03-functions-closures.nit", output: ["120", "17"] },
  { file: "04-lists-map.nit", output: ["[1, 2, 3, 4]", "[1, 4, 9, 16]", "[]"] },
  { file: "05-references.nit", output: ["25", "25", "9"] },
  { file: "06-classes.nit", output: ["circle", "unit circle", "true"] },
  { file: "07-exceptions.nit", output: ["expected a positive value", "3"] },
  { file: "08-pattern-matching.nit", output: ["zero", "many", "enabled"] },
  {
    file: "09-showcase.nit",
    output: ["[0, 1, 1, 2, 3, 5, 8]", "NITLang", "ready"],
  },
];

function loadExample(file: string): SourceFile {
  const path = resolve(import.meta.dir, "..", "examples", file);
  return new SourceFile(path, readFileSync(path, "utf8"));
}

function execute(example: Example, backend: "interpreter" | "vm"): string[] {
  const output: string[] = [];
  const result =
    backend === "vm"
      ? runVm(loadExample(example.file), (line) => output.push(line))
      : run(loadExample(example.file), (line) => output.push(line));

  if (!result.ok) {
    throw new Error(`${example.file}: ${result.diagnostic.category}: ${result.diagnostic.message}`);
  }
  return output;
}

describe("runnable examples", () => {
  for (const example of examples) {
    test(`${example.file} runs with its documented output`, () => {
      expect(execute(example, "interpreter")).toEqual(example.output);
    });

    if (example.vm === true) {
      test(`${example.file} has interpreter/VM parity`, () => {
        expect(execute(example, "vm")).toEqual(example.output);
      });
    }
  }
});
