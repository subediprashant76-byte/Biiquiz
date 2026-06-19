type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

export async function callGeminiWithFallback(keys: string[], model: string, prompt: string, fetcher: typeof fetch = fetch) {
  let lastError = "AI generation is temporarily unavailable with the provided Gemini keys.";
  for (const key of keys.filter(Boolean)) {
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const body = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      lastError = body.error?.message ?? lastError;
      continue;
    }
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      lastError = "Gemini returned an empty response.";
      continue;
    }
    return parseGeminiJson(text);
  }
  throw new Error(lastError);
}

export function parseGeminiJson(text: string) {
  return JSON.parse(text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim()) as unknown;
}

export function buildRepairPrompt(rawJson: unknown, validationErrors: unknown) {
  return `Repair this quiz JSON so it matches the required schema.
Return valid JSON only. Do not return markdown.
Keep the original meaning where possible.
Every question must include questionText, optionA, optionB, optionC, optionD, correctOption A-D, marks, timeLimit, and optional explanation.

Validation errors:
${JSON.stringify(validationErrors, null, 2)}

Original JSON:
${JSON.stringify(rawJson, null, 2)}`;
}

