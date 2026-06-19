export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

