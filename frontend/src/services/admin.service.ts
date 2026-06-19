import { db } from "@/lib/db";

export async function getAdminOverview() {
  const [hosts, quizzes, rooms, activeRooms, participants, aiGenerations] = await Promise.all([
    db.user.count({ where: { role: "host" } }),
    db.quiz.count(),
    db.room.count(),
    db.room.count({ where: { status: "active" } }),
    db.participant.count(),
    db.aiGeneration.count()
  ]);
  return { hosts, quizzes, rooms, activeRooms, participants, aiGenerations };
}

export async function listUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, organization: true }
  });
}

export async function listAiUsage() {
  return db.aiUsageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { host: { select: { name: true, email: true } }, organization: true }
  });
}

export async function getAnalyticsOverview() {
  const [rooms, answers, avgScore] = await Promise.all([
    db.room.count(),
    db.answer.count(),
    db.participant.aggregate({ _avg: { score: true } })
  ]);
  return {
    rooms,
    answers,
    averageScore: Math.round(avgScore._avg.score ?? 0)
  };
}

