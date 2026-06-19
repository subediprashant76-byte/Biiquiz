import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import type { z } from "zod";
import type { quizCreateSchema, quizUpdateSchema } from "@/schemas/quiz.schema";

export async function listQuizzes(user: SessionUser) {
  return db.quiz.findMany({
    where: user.role === "admin" ? {} : { hostId: user.id },
    include: { _count: { select: { questions: true, rooms: true } } },
    orderBy: { createdAt: "desc" }
  });
}

export async function createQuiz(user: SessionUser, input: z.infer<typeof quizCreateSchema>) {
  return db.quiz.create({
    data: {
      hostId: user.id,
      organizationId: user.organizationId,
      title: input.title,
      subject: input.subject,
      description: input.description,
      defaultTimeLimit: input.defaultTimeLimit,
      defaultMarks: input.defaultMarks,
      visibility: input.visibility
    }
  });
}

export async function getQuizForHost(user: SessionUser, quizId: string) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { orderNumber: "asc" } } }
  });
  if (!quiz) throw new Error("Quiz not found.");
  if (user.role !== "admin" && quiz.hostId !== user.id) throw new Error("You cannot access this quiz.");
  return quiz;
}

export async function updateQuiz(user: SessionUser, quizId: string, input: z.infer<typeof quizUpdateSchema>) {
  await getQuizForHost(user, quizId);
  return db.quiz.update({ where: { id: quizId }, data: input });
}

export async function deleteQuiz(user: SessionUser, quizId: string) {
  await getQuizForHost(user, quizId);
  return db.quiz.update({ where: { id: quizId }, data: { status: "archived" } });
}

