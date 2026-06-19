import { z } from "zod";

export const correctOptionSchema = z.enum(["A", "B", "C", "D"]);

export const questionSchema = z.object({
  questionText: z.string().trim().min(5).max(5000),
  optionA: z.string().trim().min(1).max(1000),
  optionB: z.string().trim().min(1).max(1000),
  optionC: z.string().trim().min(1).max(1000),
  optionD: z.string().trim().min(1).max(1000),
  correctOption: correctOptionSchema,
  marks: z.coerce.number().int().min(1).max(100),
  timeLimit: z.coerce.number().int().min(5).max(300),
  explanation: z.string().trim().max(3000).optional().nullable(),
  orderNumber: z.coerce.number().int().min(1)
}).strict();

export const questionUpdateSchema = questionSchema.partial();

