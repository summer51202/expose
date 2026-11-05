// Production entrypoint used by railway.json: runs `next start` and turns a
// platform-requested shutdown into a clean exit.
//
// Next 16 exits with 143 (128 + SIGTERM) after a graceful shutdown, and `npm start`
// reports that as "npm error signal SIGTERM". Railway sends SIGTERM to the old
// container on every redeploy, so both made each deploy show "Deployment crashed".
// Here SIGTERM/SIGINT are forwarded to Next, and once Next stops we exit 0.
// A crash that was not requested keeps its non-zero exit code.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

/** Exit code for this wrapper once the Next child process has exited. */
export function resolveExitCode({ shutdownRequested, code, signal }) {
  if (shutdownRequested) {
    return 0;
  }
  if (typeof code === "number") {
    return code;
  }
  return signal ? 1 : 0;
}

function main() {
  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "start", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });
  let shutdownRequested = false;

  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      shutdownRequested = true;
      child.kill(signal);
    });
  }

  child.on("exit", (code, signal) => {
    if (shutdownRequested) {
      console.log(`[start] next stopped after shutdown request (code ${code ?? signal}); exiting 0`);
    }
    process.exit(resolveExitCode({ shutdownRequested, code, signal }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
