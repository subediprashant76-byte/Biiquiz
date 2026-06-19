import Redis from "ioredis";
import { env } from "@/lib/env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = env.REDIS_URL
  ? globalForRedis.redis ??
    new Redis(env.REDIS_URL, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    })
  : null;

redis?.on("error", () => {
  // Redis is optional for local development; callers must tolerate cache misses.
});

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}
