import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createRandomToken, hashToken, setParticipantCookie, type SessionUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { generateRoomCode } from "@/utils/generate-room-code";
import { buildQuestionWindow, assertQuestionAnswerable } from "@/services/timer.service";
import { calculateScore } from "@/services/scoring.service";
import { broadcast } from "@/services/realtime.service";
import { delCache, leaderboardKey, participantCountKey, roomStateKey, setJsonCache } from "@/services/cache.service";
import { getLeaderboard } from "@/services/leaderboard.service";
import { validateHostPass } from "@/services/host-pass.service";
import type { createRoomSchema, joinRoomSchema, answerSchema } from "@/schemas/room.schema";
import type { z } from "zod";

export async function createRoom(user: SessionUser, input: z.infer<typeof createRoomSchema>) {
  const quiz = await db.quiz.findUnique({ where: { id: input.quizId }, include: { questions: true } });
  if (!quiz) throw new Error("Quiz not found.");
  if (user.role !== "admin" && quiz.hostId !== user.id) throw new Error("You cannot host this quiz.");
  if (quiz.questions.length === 0) throw new Error("Add at least one question before creating a room.");

  const requiredCount = input.participantLimit;
  const pass = requiredCount > 50
    ? await validateHostPass({
        passCode: input.hostPassCode,
        hostId: user.id,
        organizationId: user.organizationId,
        requiredParticipantCount: requiredCount
      })
    : null;

  if (requiredCount > 50 && !pass) {
    throw new Error("A valid biiQuiz Host Pass is required for more than 50 participants.");
  }

  const roomCode = await createUniqueRoomCode();
  const room = await db.room.create({
    data: {
      quizId: quiz.id,
      hostId: user.id,
      organizationId: user.organizationId,
      roomCode,
      roomName: input.roomName,
      participantLimit: input.participantLimit,
      hostPassId: pass?.id,
      showLeaderboard: input.showLeaderboard,
      showCorrectAnswer: input.showCorrectAnswer,
      scoringMode: input.scoringMode
    }
  });
  await setJsonCache(roomStateKey(room.roomCode), room, 10);
  return room;
}

export async function getRoom(roomCode: string) {
  const room = await db.room.findUnique({
    where: { roomCode },
    include: {
      quiz: { include: { questions: { orderBy: { orderNumber: "asc" } } } },
      currentQuestion: true,
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          displayName: true,
          score: true,
          attemptedCount: true,
          joinedAt: true,
          lastSeenAt: true
        }
      },
      _count: { select: { participants: true } }
    }
  });
  if (!room) throw new Error("Room not found.");
  return room;
}

export async function joinRoom(roomCode: string, input: z.infer<typeof joinRoomSchema>) {
  const token = createRandomToken();
  const tokenHash = hashToken(token);
  const participant = await db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { roomCode },
      include: { host: true, hostPass: true, _count: { select: { participants: true } } }
    });
    if (!room) throw new Error("Room not found.");
    if (room.status === "ended") throw new Error("This room has ended.");
    const nextCount = room._count.participants + 1;
    if (nextCount > room.participantLimit) {
      throw new Error("This room is full.");
    }
    if (nextCount > room.freeLimit) {
      const passValid =
        room.hostPass &&
        room.hostPass.isActive &&
        room.hostPass.validUntil >= new Date() &&
        room.hostPass.participantLimit >= nextCount;
      if (!passValid) {
        throw new Error(
          "This quiz room has reached the free limit of 50 participants. Please ask the host to upgrade with a biiQuiz Host Pass."
        );
      }
    }
    return tx.participant.create({
      data: {
        roomId: room.id,
        displayName: input.displayName,
        joinTokenHash: tokenHash,
        lastSeenAt: new Date()
      }
    });
  });
  await setParticipantCookie(roomCode, token);
  await delCache(participantCountKey(roomCode), roomStateKey(roomCode));
  await broadcast(roomCode, "room:participant_joined", { participantId: participant.id, name: participant.displayName });
  return participant;
}

export async function startRoom(user: SessionUser, roomCode: string) {
  const room = await getOwnedRoom(user, roomCode);
  const firstQuestion = await db.question.findFirst({
    where: { quizId: room.quizId },
    orderBy: { orderNumber: "asc" }
  });
  if (!firstQuestion) throw new Error("This quiz has no questions.");
  const window = buildQuestionWindow(firstQuestion.timeLimit);
  const updated = await db.room.update({
    where: { id: room.id },
    data: {
      status: "active",
      currentQuestionId: firstQuestion.id,
      currentQuestionOrder: firstQuestion.orderNumber,
      currentQuestionStartedAt: window.startedAt,
      currentQuestionEndsAt: window.endsAt,
      startedAt: room.startedAt ?? window.startedAt
    }
  });
  await delCache(roomStateKey(roomCode), leaderboardKey(roomCode));
  await broadcast(roomCode, "room:started", { roomCode });
  await broadcast(roomCode, "question:started", { questionId: firstQuestion.id, endsAt: window.endsAt });
  return updated;
}

export async function pauseRoom(user: SessionUser, roomCode: string) {
  const room = await getOwnedRoom(user, roomCode);
  const updated = await db.room.update({ where: { id: room.id }, data: { status: "paused" } });
  await delCache(roomStateKey(roomCode));
  await broadcast(roomCode, "room:paused", { roomCode });
  return updated;
}

export async function nextQuestion(user: SessionUser, roomCode: string) {
  const room = await getOwnedRoom(user, roomCode);
  const next = await db.question.findFirst({
    where: { quizId: room.quizId, orderNumber: { gt: room.currentQuestionOrder ?? 0 } },
    orderBy: { orderNumber: "asc" }
  });
  if (!next) return endRoom(user, roomCode);
  const window = buildQuestionWindow(next.timeLimit);
  const updated = await db.room.update({
    where: { id: room.id },
    data: {
      status: "active",
      currentQuestionId: next.id,
      currentQuestionOrder: next.orderNumber,
      currentQuestionStartedAt: window.startedAt,
      currentQuestionEndsAt: window.endsAt
    }
  });
  await delCache(roomStateKey(roomCode), leaderboardKey(roomCode));
  await broadcast(roomCode, "question:started", { questionId: next.id, endsAt: window.endsAt });
  return updated;
}

export async function endRoom(user: SessionUser, roomCode: string) {
  const room = await getOwnedRoom(user, roomCode);
  const updated = await db.room.update({
    where: { id: room.id },
    data: { status: "ended", endedAt: new Date() }
  });
  await delCache(roomStateKey(roomCode), leaderboardKey(roomCode));
  await broadcast(roomCode, "room:ended", { roomCode });
  await broadcast(roomCode, "leaderboard:updated", { roomCode });
  return updated;
}

export async function submitAnswer(roomCode: string, participantToken: string, input: z.infer<typeof answerSchema>) {
  const participantTokenHash = hashToken(participantToken);
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { roomCode },
      include: {
        currentQuestion: true,
        participants: { where: { joinTokenHash: participantTokenHash }, take: 1 }
      }
    });
    if (!room) throw new Error("Room not found.");
    const participant = room.participants[0];
    if (!participant) throw new Error("Participant session not found.");
    if (!room.currentQuestion) throw new Error("No active question.");
    assertQuestionAnswerable(room, input.questionId, now);

    const score = calculateScore({
      selectedOption: input.selectedOption,
      correctOption: room.currentQuestion.correctOption,
      marks: room.currentQuestion.marks,
      scoringMode: room.scoringMode,
      startedAt: room.currentQuestionStartedAt!,
      endsAt: room.currentQuestionEndsAt!,
      answeredAt: now
    });

    try {
      const answer = await tx.answer.create({
        data: {
          roomId: room.id,
          participantId: participant.id,
          questionId: input.questionId,
          selectedOption: input.selectedOption,
          isCorrect: score.isCorrect,
          scoreAwarded: score.scoreAwarded,
          answeredAt: now,
          responseTimeMs: score.responseTimeMs
        }
      });
      await tx.participant.update({
        where: { id: participant.id },
        data: {
          score: { increment: score.scoreAwarded },
          attemptedCount: { increment: 1 },
          correctCount: { increment: score.isCorrect ? 1 : 0 },
          wrongCount: { increment: score.isCorrect ? 0 : 1 },
          totalResponseTimeMs: { increment: score.responseTimeMs },
          lastSeenAt: now
        }
      });
      return { answer, score };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Answer already submitted.");
      }
      throw error;
    }
  });

  await delCache(leaderboardKey(roomCode));
  await getLeaderboard(roomCode, true);
  await broadcast(roomCode, "answer:submitted", { questionId: input.questionId });
  await broadcast(roomCode, "leaderboard:updated", { roomCode });
  return result;
}

export async function exportResultsCsv(user: SessionUser, roomCode: string) {
  await getOwnedRoom(user, roomCode);
  const rows = await getLeaderboard(roomCode, true);
  return toCsv(
    rows.map((row) => ({
      rank: row.rank,
      participant: row.displayName,
      score: row.score,
      correct: row.correctCount,
      wrong: row.wrongCount,
      attempted: row.attemptedCount,
      accuracy_percent: row.accuracyPercent,
      total_response_time_ms: row.totalResponseTimeMs
    }))
  );
}

async function getOwnedRoom(user: SessionUser, roomCode: string) {
  const room = await db.room.findUnique({ where: { roomCode } });
  if (!room) throw new Error("Room not found.");
  if (user.role !== "admin" && room.hostId !== user.id) throw new Error("You cannot control this room.");
  return room;
}

async function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = generateRoomCode();
    const existing = await db.room.findUnique({ where: { roomCode }, select: { id: true } });
    if (!existing) return roomCode;
  }
  throw new Error("Could not generate a unique room code.");
}
