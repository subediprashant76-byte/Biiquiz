import { fail } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function routeHandler<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    logger.error("api:error", { message });
    if (/auth|login|required/i.test(message)) return fail("UNAUTHORIZED", message, 401);
    if (/cannot|forbidden|access/i.test(message)) return fail("FORBIDDEN", message, 403);
    if (/not found/i.test(message)) return fail("NOT_FOUND", message, 404);
    if (/already|duplicate/i.test(message)) return fail("CONFLICT", message, 409);
    return fail("BAD_REQUEST", message, 400);
  }
}

