import { readFileSync } from "node:fs";
import { runCli } from "./cli";

process.exitCode = runCli(Bun.argv.slice(2), {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
  readFile: (path) => {
    try {
      return { ok: true, text: readFileSync(path, "utf8") };
    } catch (error: unknown) {
      return { ok: false, message: error instanceof Error ? error.message : "File read failed." };
    }
  },
});
