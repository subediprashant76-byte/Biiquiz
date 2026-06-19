import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/biiquiz"),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  AUTH_SECRET: z.string().default("development-secret-change-me"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  LOG_LEVEL: z.string().default("info")
});

export const env = envSchema.parse(process.env);

