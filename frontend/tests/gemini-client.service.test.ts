import { describe, expect, it, vi } from "vitest";
import { buildRepairPrompt, callGeminiWithFallback, parseGeminiJson } from "@/services/gemini-client.service";

function response(ok: boolean, body: unknown) {
  return { ok, status: ok ? 200 : 429, json: async () => body } as Response;
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

  it("returns malformed Gemini JSON as repairable raw text", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(true, { candidates: [{ content: { parts: [{ text: "{\"questions\":[{\"bad\":true}" }] } }] }));

    const { callGeminiWithSettings } = await import("@/services/gemini-client.service");
    await expect(callGeminiWithSettings({
      primaryApiKey: "AIza-primary-secret",
      fallbackApiKeys: [],
      primaryModel: "gemini-test",
      fallbackModels: [],
      maxOutputTokens: 1024
    }, "prompt", fetcher)).resolves.toMatchObject({
      json: "{\"questions\":[{\"bad\":true}",
      parseError: expect.stringContaining("Expected")
    });
  });

  it("falls back across models without exposing the full key", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(false, { error: { message: "model failed" } }))
      .mockResolvedValueOnce(response(true, { candidates: [{ content: { parts: [{ text: "{\"ok\":true}" }] } }] }));

    const { callGeminiWithSettings } = await import("@/services/gemini-client.service");
    await expect(callGeminiWithSettings({
      primaryApiKey: "AIza-primary-secret",
      fallbackApiKeys: [],
      primaryModel: "bad-model",
      fallbackModels: ["good-model"],
      maxOutputTokens: 1024
    }, "prompt", fetcher)).resolves.toMatchObject({
      json: { ok: true },
      model: "good-model"
    });
  });

  it("builds a repair prompt without API keys", () => {
    const prompt = buildRepairPrompt({ questions: [{ correctOption: "Z" }] }, ["Question 1 invalid"]);
    expect(prompt).toContain("Question 1 invalid");
    expect(prompt).not.toContain("AIza");
  });
});
