import { z } from "zod";
import { questionSchema } from "@/schemas/question.schema";

export const aiGenerateInputSchema = z.object({
  quizId: z.string().uuid(),
  subject: z.string().trim().min(2).max(120),
  level: z.string().trim().min(1).max(80),
  topic: z.string().trim().min(2).max(180),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  language: z.string().trim().min(2).max(80),
  questionCount: z.coerce.number().int().min(1).max(50),
  marksPerQuestion: z.coerce.number().int().min(1).max(100),
  timePerQuestion: z.coerce.number().int().min(5).max(300),
  extraInstruction: z.string().trim().max(1000).optional().nullable(),
  model: z.string().trim().max(80).optional()
});

export const aiGeneratedQuizSchema = z.object({
  quizTitle: z.string().trim().min(3),
  subject: z.string().trim().min(2),
  level: z.string().trim().min(1),
  questions: z.array(
    z.object({
      questionText: z.string().trim().min(5),
      optionA: z.string().trim().min(1),
      optionB: z.string().trim().min(1),
      optionC: z.string().trim().min(1),
      optionD: z.string().trim().min(1),
      correctOption: z.enum(["A", "B", "C", "D"]),
      marks: z.coerce.number().int().min(1).max(100),
      timeLimit: z.coerce.number().int().min(5).max(300),
      explanation: z.string().trim().optional().nullable()
    }).strict()
  ).min(1).max(50)
}).strict();

export const saveAiGenerationSchema = z.object({
  input: aiGenerateInputSchema,
  generatedJson: z.unknown()
});

export const draftQuestionUpdateSchema = questionSchema.partial().extend({
  status: z.enum(["draft", "approved", "deleted"]).optional()
});

