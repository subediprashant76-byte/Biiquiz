import { z } from "zod";
import { correctOptionSchema } from "@/schemas/question.schema";

export const createRoomSchema = z.object({
  quizId: z.string().uuid(),
  roomName: z.string().trim().min(2).max(160),
  participantLimit: z.coerce.number().int().min(1).max(500).default(50),
  hostPassCode: z.string().trim().optional(),
  showLeaderboard: z.coerce.boolean().default(true),
  showCorrectAnswer: z.coerce.boolean().default(false),
  scoringMode: z.enum(["simple", "speed_bonus"]).default("simple")
});

export const joinRoomSchema = z.object({
  displayName: z.string().trim().min(2).max(80)
});

export const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOption: correctOptionSchema
});

