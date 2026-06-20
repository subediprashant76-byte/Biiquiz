import type { CorrectOption, ScoringMode } from "@/generated/prisma";

export type ScoreInput = {
  selectedOption: CorrectOption;
  correctOption: CorrectOption;
  marks: number;
  scoringMode: ScoringMode;
  startedAt: Date;
  endsAt: Date;
  answeredAt: Date;
};

export function calculateScore(input: ScoreInput) {
  const isCorrect = input.selectedOption === input.correctOption;
  if (!isCorrect) return { isCorrect, scoreAwarded: 0, responseTimeMs: responseTimeMs(input) };

  if (input.scoringMode === "speed_bonus") {
    const totalMs = Math.max(1, input.endsAt.getTime() - input.startedAt.getTime());
    const remainingMs = Math.max(0, input.endsAt.getTime() - input.answeredAt.getTime());
    const speedBonus = Math.round(input.marks * 0.5 * (remainingMs / totalMs));
    return { isCorrect, scoreAwarded: input.marks + speedBonus, responseTimeMs: responseTimeMs(input) };
  }

  return { isCorrect, scoreAwarded: input.marks, responseTimeMs: responseTimeMs(input) };
}

function responseTimeMs(input: Pick<ScoreInput, "startedAt" | "answeredAt">) {
  return Math.max(0, input.answeredAt.getTime() - input.startedAt.getTime());
}
