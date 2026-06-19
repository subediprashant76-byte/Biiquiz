import { describe, expect, it } from "vitest";
import { calculateScore } from "@/services/scoring.service";

const startedAt = new Date("2026-01-01T00:00:00.000Z");
const endsAt = new Date("2026-01-01T00:00:20.000Z");

describe("calculateScore", () => {
  it("awards marks for a correct simple-mode answer", () => {
    const result = calculateScore({
      selectedOption: "A",
      correctOption: "A",
      marks: 100,
      scoringMode: "simple",
      startedAt,
      endsAt,
      answeredAt: new Date("2026-01-01T00:00:10.000Z")
    });
    expect(result.scoreAwarded).toBe(100);
    expect(result.isCorrect).toBe(true);
  });

  it("never subtracts marks for wrong answers", () => {
    const result = calculateScore({
      selectedOption: "B",
      correctOption: "A",
      marks: 100,
      scoringMode: "speed_bonus",
      startedAt,
      endsAt,
      answeredAt: new Date("2026-01-01T00:00:10.000Z")
    });
    expect(result.scoreAwarded).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("adds speed bonus only to correct answers", () => {
    const result = calculateScore({
      selectedOption: "A",
      correctOption: "A",
      marks: 100,
      scoringMode: "speed_bonus",
      startedAt,
      endsAt,
      answeredAt: new Date("2026-01-01T00:00:10.000Z")
    });
    expect(result.scoreAwarded).toBe(125);
  });
});

