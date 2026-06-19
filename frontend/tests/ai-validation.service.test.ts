import { describe, expect, it } from "vitest";
import { validateGeneratedQuizJson } from "@/services/ai-validation.service";
import { validateAiQuestionJson } from "@/services/question-schema-validator";

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

describe("validateAiQuestionJson", () => {
  it("normalizes the browser AI schema into the backend question payload", () => {
    const result = validateAiQuestionJson({
      quiz: {
        title: "Physics Entrance Practice",
        subject: "Physics"
      },
      questions: [
        {
          questionText: "Which quantity is measured in newtons?",
          questionType: "single_correct",
          difficulty: "easy",
          options: [
            { key: "A", text: "Force" },
            { key: "B", text: "Energy" },
            { key: "C", text: "Power" },
            { key: "D", text: "Pressure" }
          ],
          correctAnswer: "A",
          explanation: "Newton is the SI unit of force.",
          marks: 1,
          negativeMarks: 0,
          timerSeconds: 30,
          tags: []
        }
      ]
    }, 4);

    expect(result.valid).toBe(true);
    expect(result.normalizedQuestions[0]).toMatchObject({
      optionA: "Force",
      correctOption: "A",
      orderNumber: 4,
      timeLimit: 30
    });
  });

  it("rejects unsupported question types and duplicate options", () => {
    const result = validateAiQuestionJson({
      quiz: { title: "Math Quiz", subject: "Math" },
      questions: [
        {
          questionText: "Select every prime number.",
          questionType: "multiple_correct",
          options: [
            { key: "A", text: "2" },
            { key: "B", text: "2" },
            { key: "C", text: "4" },
            { key: "D", text: "6" }
          ],
          correctAnswer: "A",
          marks: 1,
          timerSeconds: 30
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toContain("questionType");
    expect(result.errors.map((error) => error.field)).toContain("options");
  });
});
