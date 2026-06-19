type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

export type GeminiErrorCode =
  | "GEMINI_API_KEY_REQUIRED"
  | "GEMINI_AUTH_FAILED"
  | "GEMINI_RATE_LIMITED"
  | "GEMINI_QUOTA_EXCEEDED"
  | "GEMINI_RESPONSE_INVALID_JSON"
  | "GEMINI_NETWORK_ERROR"
  | "GEMINI_EMPTY_RESPONSE";

export type GeminiSettings = {
  primaryApiKey: string;
  fallbackApiKeys: string[];
  primaryModel: string;
  fallbackModels: string[];
  maxOutputTokens: number;
};

export type GeminiCallResult = {
  json: unknown;
  rawText: string;
  parseError?: string;
  keyIndex: number;
  keyLabel: string;
  model: string;
};

export class GeminiClientError extends Error {
  constructor(
    public code: GeminiErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GeminiClientError";
  }
}

type GeminiFetcher = typeof fetch;

export async function callGeminiWithFallback(keys: string[], model: string, prompt: string, fetcher: GeminiFetcher = fetch) {
  const result = await callGeminiWithSettings(
    {
      primaryApiKey: keys[0] ?? "",
      fallbackApiKeys: keys.slice(1),
      primaryModel: model,
      fallbackModels: [],
      maxOutputTokens: 8192
    },
    prompt,
    fetcher
  );
  return result.json;
}

export async function callGeminiWithSettings(settings: GeminiSettings, prompt: string, fetcher: GeminiFetcher = fetch): Promise<GeminiCallResult> {
  const keys = normalizeKeys([settings.primaryApiKey, ...settings.fallbackApiKeys]);
  const models = normalizeModels([settings.primaryModel, ...settings.fallbackModels]);

  if (keys.length === 0) {
    throw new GeminiClientError("GEMINI_API_KEY_REQUIRED", "Please add your Gemini API key to generate questions.");
  }

  let lastError: Error = new GeminiClientError("GEMINI_NETWORK_ERROR", "AI generation is temporarily unavailable with the provided Gemini keys.");

  for (const [keyIndex, key] of keys.entries()) {
    for (const model of models) {
      try {
        const generated = await callGemini(key, model, prompt, settings.maxOutputTokens, fetcher);
        return {
          json: generated.json,
          rawText: generated.rawText,
          parseError: generated.parseError,
          keyIndex,
          keyLabel: maskGeminiKey(key, keyIndex),
          model
        };
      } catch (error) {
        lastError = error instanceof Error ? error : lastError;
      }
    }
  }

  throw lastError;
}

async function callGemini(key: string, model: string, prompt: string, maxOutputTokens: number, fetcher: GeminiFetcher) {
  let response: Response;
  try {
    response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens
          }
        })
      }
    );
  } catch (error) {
    throw new GeminiClientError("GEMINI_NETWORK_ERROR", error instanceof Error ? error.message : "Gemini network request failed.");
  }

  const body = (await response.json()) as GeminiResponse;
  if (!response.ok) throw classifyGeminiError(response.status, body.error?.message);

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiClientError("GEMINI_EMPTY_RESPONSE", "Gemini returned an empty response.");

  try {
    return { json: parseGeminiJson(text), rawText: text };
  } catch (error) {
    return {
      json: text,
      rawText: text,
      parseError: error instanceof Error ? error.message : "AI returned invalid JSON. Repairing automatically."
    };
  }
}

export function parseGeminiJson(text: string) {
  const unfenced = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const firstBrace = unfenced.indexOf("{");
  const firstBracket = unfenced.indexOf("[");
  const starts = [firstBrace, firstBracket].filter((index) => index >= 0).sort((a, b) => a - b);
  const start = starts[0] ?? 0;
  const end = Math.max(unfenced.lastIndexOf("}"), unfenced.lastIndexOf("]"));
  const jsonText = end >= start ? unfenced.slice(start, end + 1) : unfenced;
  return JSON.parse(jsonText) as unknown;
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

export function buildQuestionRepairPrompt(rawJson: unknown, validationErrors: unknown) {
  return `Return valid JSON only. Do not include markdown. Do not include explanation outside JSON.
Keep the same quiz intent. Fix only schema and validation errors. Do not remove valid questions unless necessary.
The backend supports only single_correct multiple-choice questions with four options A-D.

Required JSON shape:
{"quiz":{"title":"","subject":"","description":"","visibility":"private","defaultTimer":30,"defaultMarks":1},"questions":[{"questionText":"","questionType":"single_correct","difficulty":"easy","options":[{"key":"A","text":""},{"key":"B","text":""},{"key":"C","text":""},{"key":"D","text":""}],"correctAnswer":"A","explanation":"","marks":1,"negativeMarks":0,"timerSeconds":30,"tags":[]}]}

Validation errors:
${JSON.stringify(validationErrors, null, 2)}

Prior JSON:
${JSON.stringify(rawJson, null, 2)}`;
}

export function maskGeminiKey(key: string, index = 0) {
  const trimmed = key.trim();
  if (!trimmed) return `Key ${index + 1}`;
  if (trimmed.length <= 8) return `Key ${index + 1} (${trimmed.slice(0, 2)}...)`;
  return `Key ${index + 1} (${trimmed.slice(0, 4)}...${trimmed.slice(-4)})`;
}

function normalizeKeys(keys: string[]) {
  return keys
    .flatMap((key) => key.split(/[\n,]+/))
    .map((key) => key.trim())
    .filter(Boolean);
}

function normalizeModels(models: string[]) {
  const normalized = models
    .flatMap((model) => model.split(/[\n,]+/))
    .map((model) => model.trim())
    .filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : ["gemini-2.5-flash"];
}

function classifyGeminiError(status: number, message?: string) {
  const lower = message?.toLowerCase() ?? "";
  if (status === 401 || status === 403) {
    return new GeminiClientError("GEMINI_AUTH_FAILED", "Gemini authentication failed. Check the selected API key.");
  }
  if (status === 429 && lower.includes("quota")) {
    return new GeminiClientError("GEMINI_QUOTA_EXCEEDED", "Gemini quota was exceeded for the selected API key.");
  }
  if (status === 429) {
    return new GeminiClientError("GEMINI_RATE_LIMITED", "Gemini rate limited the selected API key.");
  }
  return new GeminiClientError("GEMINI_NETWORK_ERROR", message ?? "Gemini request failed.");
}
