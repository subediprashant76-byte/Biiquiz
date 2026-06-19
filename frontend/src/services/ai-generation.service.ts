import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { validateGeneratedQuizJson } from "@/services/ai-validation.service";
import type { saveAiGenerationSchema, draftQuestionUpdateSchema } from "@/schemas/ai.schema";
import type { questionSchema } from "@/schemas/question.schema";
import type { z } from "zod";

export function buildGenerationPrompt(input: z.infer<typeof saveAiGenerationSchema>["input"]) {
  return `Generate quiz questions as valid JSON only.

Rules:
- Create multiple-choice questions only.
- Each question must have exactly 4 options.
- correctOption must be A, B, C, or D.
- Do not add negative marking.
- Wrong answer gets 0.
- Timeout gets 0.
- No answer gets 0.
- Marks and timeLimit must be integers.

Host input:
Subject: ${input.subject}
Level: ${input.level}
Topic: ${input.topic}
Difficulty: ${input.difficulty}
Language: ${input.language}
Question count: ${input.questionCount}
Marks per question: ${input.marksPerQuestion}
Time per question: ${input.timePerQuestion}
Extra instruction: ${input.extraInstruction ?? ""}`;
}

export async function saveAiGeneration(user: SessionUser, payload: z.infer<typeof saveAiGenerationSchema>) {
  const quiz = await db.quiz.findUnique({ where: { id: payload.input.quizId } });
  if (!quiz) throw new Error("Quiz not found.");
  if (user.role !== "admin" && quiz.hostId !== user.id) throw new Error("You cannot generate questions for this quiz.");
  if (payload.input.questionCount > 50) throw new Error("A generation payload can save at most 50 questions.");

  const validation = validateGeneratedQuizJson(payload.generatedJson);
  const generation = await db.aiGeneration.create({
    data: {
      hostId: user.id,
      quizId: quiz.id,
      inputPrompt: buildGenerationPrompt(payload.input),
      inputSubject: payload.input.subject,
      inputLevel: payload.input.level,
      inputTopic: payload.input.topic,
      inputDifficulty: payload.input.difficulty,
      inputLanguage: payload.input.language,
      questionCount: payload.input.questionCount,
      marksPerQuestion: payload.input.marksPerQuestion,
      timePerQuestion: payload.input.timePerQuestion,
      rawJson: payload.generatedJson as object,
      fixedJson: validation.ok ? validation.cleaned : undefined,
      validationErrors: validation.ok ? undefined : validation.errors,
      status: validation.ok ? "ready_for_preview" : "validation_failed",
      model: payload.input.model
    }
  });

  await db.aiUsageLog.create({
    data: {
      hostId: user.id,
      organizationId: user.organizationId,
      action: "generate",
      questionCount: payload.input.questionCount,
      model: payload.input.model,
      status: validation.ok ? "success" : "failed",
      errorMessage: validation.ok ? null : "Generated JSON failed validation."
    }
  });

  if (!validation.ok) return { generation, drafts: [], validationErrors: validation.errors };

  const drafts = await db.$transaction(
    validation.cleaned.questions.map((question, index) =>
      db.aiQuestionDraft.create({
        data: {
          generationId: generation.id,
          quizId: quiz.id,
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          marks: question.marks,
          timeLimit: question.timeLimit,
          explanation: question.explanation,
          orderNumber: index + 1
        }
      })
    )
  );

  return { generation, drafts, validationErrors: null };
}

export async function getAiGeneration(user: SessionUser, generationId: string) {
  const generation = await db.aiGeneration.findUnique({
    where: { id: generationId },
    include: { drafts: { orderBy: { orderNumber: "asc" } } }
  });
  if (!generation) throw new Error("AI generation not found.");
  if (user.role !== "admin" && generation.hostId !== user.id) throw new Error("You cannot view this AI generation.");
  return generation;
}

export async function updateDraftQuestion(
  user: SessionUser,
  draftQuestionId: string,
  input: z.infer<typeof draftQuestionUpdateSchema>
) {
  const draft = await db.aiQuestionDraft.findUnique({
    where: { id: draftQuestionId },
    include: { generation: true }
  });
  if (!draft) throw new Error("Draft question not found.");
  if (user.role !== "admin" && draft.generation.hostId !== user.id) throw new Error("You cannot edit this draft.");
  return db.aiQuestionDraft.update({ where: { id: draftQuestionId }, data: input });
}

export async function addDraftQuestion(
  user: SessionUser,
  generationId: string,
  input: z.infer<typeof questionSchema>
) {
  const generation = await getAiGeneration(user, generationId);
  const lastDraft = await db.aiQuestionDraft.findFirst({
    where: { generationId },
    orderBy: { orderNumber: "desc" }
  });
  return db.aiQuestionDraft.create({
    data: {
      generationId,
      quizId: generation.quizId,
      questionText: input.questionText,
      optionA: input.optionA,
      optionB: input.optionB,
      optionC: input.optionC,
      optionD: input.optionD,
      correctOption: input.correctOption,
      marks: input.marks,
      timeLimit: input.timeLimit,
      explanation: input.explanation,
      orderNumber: (lastDraft?.orderNumber ?? 0) + 1
    }
  });
}

export async function saveRepairedGeneration(
  user: SessionUser,
  generationId: string,
  repairedJson: unknown
) {
  const generation = await getAiGeneration(user, generationId);
  const validation = validateGeneratedQuizJson(repairedJson);
  const updated = await db.aiGeneration.update({
    where: { id: generationId },
    data: {
      fixedJson: validation.ok ? validation.cleaned : repairedJson as object,
      validationErrors: validation.ok ? undefined : validation.errors,
      status: validation.ok ? "repaired" : "validation_failed",
      attemptCount: { increment: 1 }
    }
  });
  await db.aiUsageLog.create({
    data: {
      hostId: user.id,
      organizationId: user.organizationId,
      action: "repair",
      questionCount: generation.questionCount,
      model: generation.model,
      status: validation.ok ? "success" : "failed",
      errorMessage: validation.ok ? null : "Repaired JSON failed validation."
    }
  });
  if (!validation.ok) return { generation: updated, drafts: [], validationErrors: validation.errors };
  await db.aiQuestionDraft.deleteMany({ where: { generationId } });
  const drafts = await db.$transaction(
    validation.cleaned.questions.map((question, index) =>
      db.aiQuestionDraft.create({
        data: {
          generationId,
          quizId: generation.quizId,
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          marks: question.marks,
          timeLimit: question.timeLimit,
          explanation: question.explanation,
          orderNumber: index + 1
        }
      })
    )
  );
  return { generation: updated, drafts, validationErrors: null };
}

export async function publishAiQuestions(user: SessionUser, generationId: string) {
  const generation = await getAiGeneration(user, generationId);
  if (generation.status !== "ready_for_preview" && generation.status !== "repaired") {
    throw new Error("AI questions must pass backend validation before publishing.");
  }
  const drafts = generation.drafts.filter((draft) => draft.status !== "deleted");
  if (drafts.length === 0) throw new Error("There are no draft questions to publish.");

  return db.$transaction(async (tx) => {
    const lastQuestion = await tx.question.findFirst({
      where: { quizId: generation.quizId },
      orderBy: { orderNumber: "desc" }
    });
    const startOrder = lastQuestion?.orderNumber ?? 0;
    const questions = await Promise.all(
      drafts.map((draft, index) =>
        tx.question.create({
          data: {
            quizId: generation.quizId,
            questionText: draft.questionText,
            optionA: draft.optionA,
            optionB: draft.optionB,
            optionC: draft.optionC,
            optionD: draft.optionD,
            correctOption: draft.correctOption,
            marks: draft.marks,
            timeLimit: draft.timeLimit,
            explanation: draft.explanation,
            orderNumber: startOrder + index + 1
          }
        })
      )
    );
    await tx.aiGeneration.update({ where: { id: generation.id }, data: { status: "published" } });
    await tx.aiUsageLog.create({
      data: {
        hostId: user.id,
        organizationId: user.organizationId,
        action: "publish",
        questionCount: drafts.length,
        model: generation.model,
        status: "success"
      }
    });
    return questions;
  });
}
