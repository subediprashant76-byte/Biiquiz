import { db } from "@/lib/db";
import { getJsonCache, leaderboardKey, setJsonCache } from "@/services/cache.service";

export type LeaderboardRow = {
  rank: number;
  participantId: string;
  displayName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  attemptedCount: number;
  accuracyPercent: number;
  totalResponseTimeMs: number;
};

export async function getLeaderboard(roomCode: string, force = false): Promise<LeaderboardRow[]> {
  const key = leaderboardKey(roomCode);
  if (!force) {
    const cached = await getJsonCache<LeaderboardRow[]>(key);
    if (cached) return cached;
  }

  const room = await db.room.findUnique({
    where: { roomCode },
    select: {
      id: true,
      participants: {
        orderBy: [{ score: "desc" }, { totalResponseTimeMs: "asc" }, { joinedAt: "asc" }],
        take: 500
      }
    }
  });
  if (!room) throw new Error("Room not found.");

  const rows = room.participants.map((participant, index) => ({
    rank: index + 1,
    participantId: participant.id,
    displayName: participant.displayName,
    score: participant.score,
    correctCount: participant.correctCount,
    wrongCount: participant.wrongCount,
    attemptedCount: participant.attemptedCount,
    accuracyPercent:
      participant.attemptedCount === 0 ? 0 : Math.round((participant.correctCount / participant.attemptedCount) * 100),
    totalResponseTimeMs: participant.totalResponseTimeMs
  }));

  await setJsonCache(key, rows, 5);
  return rows;
}

