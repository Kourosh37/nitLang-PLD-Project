import { runCli } from "./cli";

process.exitCode = runCli(Bun.argv.slice(2), {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
});
