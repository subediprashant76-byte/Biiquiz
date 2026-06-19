import { afterEach, describe, expect, it, vi } from "vitest";
import { runAiQuestionRepairLoop } from "@/services/ai-repair-loop.service";

function response(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }]
    })
  } as Response;
}

describe("runAiQuestionRepairLoop", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("repairs generated JSON until the normalized questions are valid", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({
        quiz: { title: "Physics Quiz", subject: "Physics" },
        questions: [
          {
            questionText: "Which unit measures force?",
            questionType: "single_correct",
            options: [
              { key: "A", text: "Newton" },
              { key: "B", text: "Joule" },
              { key: "C", text: "Watt" },
              { key: "D", text: "Pascal" }
            ],
            correctAnswer: "Z",
            marks: 1,
            timerSeconds: 30
          }
        ]
      }))
      .mockResolvedValueOnce(response({
        quiz: { title: "Physics Quiz", subject: "Physics" },
        questions: [
          {
            questionText: "Which unit measures force?",
            questionType: "single_correct",
            difficulty: "easy",
            options: [
              { key: "A", text: "Newton" },
              { key: "B", text: "Joule" },
              { key: "C", text: "Watt" },
              { key: "D", text: "Pascal" }
            ],
            correctAnswer: "A",
            explanation: "Newton is the SI unit of force.",
            marks: 1,
            negativeMarks: 0,
            timerSeconds: 30,
            tags: []
          }
        ]
      }));

    vi.stubGlobal("fetch", fetcher);

    const result = await runAiQuestionRepairLoop({
      prompt: "generate",
      settings: {
        primaryApiKey: "AIza-test-key",
        fallbackApiKeys: [],
        primaryModel: "gemini-test",
        fallbackModels: [],
        maxOutputTokens: 1024
      },
      repairAttempts: 1,
      startOrder: 2
    });

    expect(result.status).toBe("ready");
    expect(result.questions[0]).toMatchObject({ correctOption: "A", orderNumber: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("continues generating until the requested question count is reached", async () => {
    const makeQuestion = (index: number) => ({
      questionText: `Which option is correct for concept ${index}?`,
      questionType: "single_correct",
      difficulty: "easy",
      options: [
        { key: "A", text: `Correct ${index}` },
        { key: "B", text: `Wrong B ${index}` },
        { key: "C", text: `Wrong C ${index}` },
        { key: "D", text: `Wrong D ${index}` }
      ],
      correctAnswer: "A",
      explanation: "Explanation.",
      marks: 1,
      negativeMarks: 0,
      timerSeconds: 30,
      tags: []
    });
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({
        quiz: { title: "Count Quiz", subject: "Science" },
        questions: [makeQuestion(1), makeQuestion(2)]
      }))
      .mockResolvedValueOnce(response({
        quiz: { title: "Count Quiz", subject: "Science" },
        questions: [makeQuestion(3), makeQuestion(4)]
      }));

    vi.stubGlobal("fetch", fetcher);

    const result = await runAiQuestionRepairLoop({
      prompt: "generate",
      settings: {
        primaryApiKey: "AIza-test-key",
        fallbackApiKeys: [],
        primaryModel: "gemini-test",
        fallbackModels: [],
        maxOutputTokens: 1024
      },
      repairAttempts: 1,
      startOrder: 1,
      targetCount: 4
    });

    expect(result.status).toBe("ready");
    expect(result.questions).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
