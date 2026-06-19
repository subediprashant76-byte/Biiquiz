import { aiGeneratedQuizSchema } from "@/schemas/ai.schema";

const unsupportedFields = new Set(["negativeMarks", "negative_marking", "penalty", "deductMarks"]);

export function cleanGeneratedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanGeneratedJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !unsupportedFields.has(key))
      .map(([key, child]) => [key, normalizeValue(key, cleanGeneratedJson(child))])
  );
}

export function validateGeneratedQuizJson(value: unknown) {
  const cleaned = cleanGeneratedJson(value);
  const parsed = aiGeneratedQuizSchema.safeParse(cleaned);
  if (!parsed.success) {
    return {
      ok: false as const,
      cleaned,
      errors: parsed.error.flatten()
    };
  }
  const deduped = removeDuplicateQuestions(parsed.data);
  return {
    ok: true as const,
    cleaned: deduped,
    errors: null
  };
}

function normalizeValue(key: string, value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (key === "correctOption") return trimmed.toUpperCase();
    if (key === "marks" || key === "timeLimit") return Number(trimmed);
    return trimmed;
  }
  return value;
}

function removeDuplicateQuestions<T extends { questions: Array<{ questionText: string }> }>(quiz: T): T {
  const seen = new Set<string>();
  return {
    ...quiz,
    questions: quiz.questions.filter((question) => {
      const key = question.questionText.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  };
}

