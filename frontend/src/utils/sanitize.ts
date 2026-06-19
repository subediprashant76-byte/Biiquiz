export function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function stripPossibleApiKeys(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_GEMINI_KEY]");
  if (Array.isArray(value)) return value.map(stripPossibleApiKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, stripPossibleApiKeys(child)]));
  }
  return value;
}

