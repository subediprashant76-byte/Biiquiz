import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { getJsonCache, leaderboardKey, setJsonCache } from "@/services/cache.service";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  participantId: string;
  name: string;
  displayName: string;
  score: number;
  correct: number;
  correctCount: number;
  wrongCount: number;
  attempted: number;
  attemptedCount: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  isCurrentUser: boolean;
  accuracyPercent: number;
  totalResponseTimeMs: number;
};

export type RoomLeaderboard = {
  roomId: string;
  quizId: string;
  quizStatus: "waiting" | "live" | "paused" | "ended";
  leaderboard: LeaderboardRow[];
};

export async function getLeaderboard(roomCode: string, force = false): Promise<LeaderboardRow[]> {
  const leaderboard = await getRoomLeaderboard(roomCode, undefined, force);
  return leaderboard.leaderboard;
}

export async function getRoomLeaderboard(
  roomCode: string,
  participantToken?: string | null,
  force = false
): Promise<RoomLeaderboard> {
  const key = leaderboardKey(roomCode);
  if (!force && !participantToken) {
    const cached = await getJsonCache<RoomLeaderboard>(key);
    if (cached) return cached;
  }
  const participantTokenHash = participantToken ? hashToken(participantToken) : null;

  const room = await db.room.findUnique({
    where: { roomCode },
    select: {
      id: true,
      quizId: true,
      status: true,
      quiz: {
        select: {
          _count: { select: { questions: true } }
        }
      },
      participants: {
        orderBy: [{ score: "desc" }, { correctCount: "desc" }, { totalResponseTimeMs: "asc" }, { joinedAt: "asc" }],
        take: 500
      }
    }
  });
  if (!room) throw new Error("Room not found.");

  const totalQuestions = room.quiz._count.questions;
  const rows = room.participants.map((participant, index) => ({
    rank: index + 1,
    userId: participant.id,
    participantId: participant.id,
    name: participant.displayName,
    displayName: participant.displayName,
    score: participant.score,
    correct: participant.correctCount,
    correctCount: participant.correctCount,
    wrongCount: participant.wrongCount,
    attempted: participant.attemptedCount,
    attemptedCount: participant.attemptedCount,
    totalQuestions,
    timeTakenSeconds: Math.ceil(participant.totalResponseTimeMs / 1000),
    isCurrentUser: participantTokenHash ? participant.joinTokenHash === participantTokenHash : false,
    accuracyPercent:
      participant.attemptedCount === 0 ? 0 : Math.round((participant.correctCount / participant.attemptedCount) * 100),
    totalResponseTimeMs: participant.totalResponseTimeMs
  }));

  const payload: RoomLeaderboard = {
    roomId: room.id,
    quizId: room.quizId,
    quizStatus: room.status === "active" ? "live" : room.status,
    leaderboard: rows
  };

  if (!participantToken) await setJsonCache(key, payload, 5);
  return payload;
}
