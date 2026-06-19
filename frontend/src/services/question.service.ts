import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { getQuizForHost } from "@/services/quiz.service";
import type { questionSchema, questionUpdateSchema } from "@/schemas/question.schema";
import type { z } from "zod";

export async function createQuestion(user: SessionUser, quizId: string, input: z.infer<typeof questionSchema>) {
  await getQuizForHost(user, quizId);
  return db.question.create({
    data: {
      quizId,
      questionText: input.questionText,
      optionA: input.optionA,
      optionB: input.optionB,
      optionC: input.optionC,
      optionD: input.optionD,
      correctOption: input.correctOption,
      marks: input.marks,
      timeLimit: input.timeLimit,
      explanation: input.explanation,
      orderNumber: input.orderNumber
    }
  });
}

export async function updateQuestion(user: SessionUser, questionId: string, input: z.infer<typeof questionUpdateSchema>) {
  const question = await db.question.findUnique({ where: { id: questionId }, include: { quiz: true } });
  if (!question) throw new Error("Question not found.");
  if (user.role !== "admin" && question.quiz.hostId !== user.id) throw new Error("You cannot edit this question.");
  return db.question.update({ where: { id: questionId }, data: input });
}

export async function deleteQuestion(user: SessionUser, questionId: string) {
  const question = await db.question.findUnique({ where: { id: questionId }, include: { quiz: true } });
  if (!question) throw new Error("Question not found.");
  if (user.role !== "admin" && question.quiz.hostId !== user.id) throw new Error("You cannot delete this question.");
  return db.question.delete({ where: { id: questionId } });
}

