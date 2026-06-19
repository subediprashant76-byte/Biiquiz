import { describe, expect, it } from "vitest";
import { validateGeneratedQuizJson } from "@/services/ai-validation.service";

describe("validateGeneratedQuizJson", () => {
  it("removes negative marking fields and normalizes correct option", () => {
    const result = validateGeneratedQuizJson({
      quizTitle: "Physics Practice",
      subject: "Physics",
      level: "Grade 10",
      questions: [
        {
          questionText: "What is the SI unit of force?",
          optionA: "Newton",
          optionB: "Joule",
          optionC: "Watt",
          optionD: "Pascal",
          correctOption: "a",
          marks: "5",
          timeLimit: "30",
          negativeMarks: 2
        }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cleaned.questions[0].correctOption).toBe("A");
      expect(result.cleaned.questions[0]).not.toHaveProperty("negativeMarks");
    }
  });
});

