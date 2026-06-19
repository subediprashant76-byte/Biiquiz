import { describe, expect, it, vi } from "vitest";
import { buildRepairPrompt, callGeminiWithFallback, parseGeminiJson } from "@/services/gemini-client.service";

function response(ok: boolean, body: unknown) {
  return { ok, json: async () => body } as Response;
}

describe("gemini client service", () => {
  it("parses fenced JSON responses", () => {
    expect(parseGeminiJson("```json\n{\"questions\":[]}\n```")).toEqual({ questions: [] });
  });

  it("uses the first successful Gemini key", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(false, { error: { message: "quota" } }))
      .mockResolvedValueOnce(response(true, { candidates: [{ content: { parts: [{ text: "{\"ok\":true}" }] } }] }));

    await expect(callGeminiWithFallback(["bad", "good"], "gemini-test", "prompt", fetcher)).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("builds a repair prompt without API keys", () => {
    const prompt = buildRepairPrompt({ questions: [{ correctOption: "Z" }] }, ["Question 1 invalid"]);
    expect(prompt).toContain("Question 1 invalid");
    expect(prompt).not.toContain("AIza");
  });
});

