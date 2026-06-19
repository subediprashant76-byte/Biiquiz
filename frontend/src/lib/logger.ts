export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(message, meta ?? {});
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(message, meta ?? {});
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(message, redactSecrets(meta ?? {}));
  }
};

function redactSecrets(meta: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(meta, (_key, value) => {
      if (typeof value === "string" && /AIza[0-9A-Za-z_-]{20,}/.test(value)) {
        return "[REDACTED_GEMINI_KEY]";
      }
      return value;
    })
  ) as Record<string, unknown>;
}

