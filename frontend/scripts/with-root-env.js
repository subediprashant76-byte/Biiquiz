const { existsSync, readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

for (const path of [resolve(__dirname, "../../.env"), resolve(__dirname, "../.env")]) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/with-root-env.js <command> [...args]");
  process.exit(1);
}

const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: process.env });
process.exit(result.status ?? 1);

