import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(frontendDir);

loadRootEnv();

function loadRootEnv() {
  const envPath = `${rootDir}/.env`;
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: rootDir,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  async rewrites() {
    if ((process.env.USE_DJANGO_API ?? "true") !== "true") return [];
    const configuredUrl = process.env.DJANGO_API_URL;
    if (!configuredUrl && process.env.NODE_ENV === "production") {
      throw new Error("DJANGO_API_URL is required for a production frontend build.");
    }
    const djangoApiUrl = (configuredUrl ?? "http://127.0.0.1:8000").replace(/\/$/, "");
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${djangoApiUrl}/api/:path*`
        }
      ]
    };
  }
};

export default nextConfig;
