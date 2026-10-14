// Tiny env loader for the Node backend — reads the project .env once and
// fills process.env (without overriding values already set in the shell).
// Avoids adding a dependency; real secrets never leave the server.

const fs = require("fs");
const path = require("path");

function loadEnv() {
  if (process.env.TCT_ENV_LOADED) return;
  try {
    // .env lives at the project root (backend/lib -> ../..)
    const raw = fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
    process.env.TCT_ENV_LOADED = "1";
  } catch {
    console.warn("[env] .env not found — using shell environment only");
  }
}

module.exports = { loadEnv };
