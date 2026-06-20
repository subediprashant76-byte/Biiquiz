const { existsSync, readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const configuredEnv = process.env.BACKEND_ENV_FILE ? resolve(process.env.BACKEND_ENV_FILE) : resolve(__dirname, "../.env.local");
const inheritedKeys = new Set(Object.keys(process.env));
const fileEnvironment = {};
for (const path of [resolve(__dirname, "../../.env"), configuredEnv]) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
    if (match) fileEnvironment[match[1]] = match[2];
  }
}
for (const [key, value] of Object.entries(fileEnvironment)) {
  if (!inheritedKeys.has(key)) process.env[key] = value;
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/with-env.js <command> [...args]");
  process.exit(1);
}

const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: process.env });
process.exit(result.status ?? 1);
