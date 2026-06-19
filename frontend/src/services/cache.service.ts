import { redis } from "@/lib/redis";

export async function getJsonCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const cached = await redis.get(key);
  return cached ? (JSON.parse(cached) as T) : null;
}

export async function setJsonCache(key: string, value: unknown, ttlSeconds: number) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function delCache(...keys: string[]) {
  if (!redis || keys.length === 0) return;
  await redis.del(...keys);
}

export function roomStateKey(roomCode: string) {
  return `room:${roomCode}:state`;
}

export function leaderboardKey(roomCode: string) {
  return `room:${roomCode}:leaderboard`;
}

export function participantCountKey(roomCode: string) {
  return `room:${roomCode}:participants:count`;
}

