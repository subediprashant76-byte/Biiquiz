import { logger } from "@/lib/logger";

export type RealtimeEvent =
  | "room:participant_joined"
  | "room:started"
  | "room:paused"
  | "room:ended"
  | "question:started"
  | "question:ended"
  | "answer:submitted"
  | "answer:count_updated"
  | "leaderboard:updated";

export async function broadcast(roomCode: string, event: RealtimeEvent, payload: Record<string, unknown>) {
  // Hook Socket.io/Redis adapter here when deploying multi-instance realtime.
  logger.info("realtime:event", { roomCode, event, payload });
}

