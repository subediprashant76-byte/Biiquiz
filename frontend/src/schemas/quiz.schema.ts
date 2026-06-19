import { z } from "zod";

export const quizCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  subject: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  defaultTimeLimit: z.coerce.number().int().min(5).max(300).default(30),
  defaultMarks: z.coerce.number().int().min(1).max(100).default(1),
  visibility: z.enum(["private", "organization", "public"]).default("private")
});

export const quizUpdateSchema = quizCreateSchema.partial();

