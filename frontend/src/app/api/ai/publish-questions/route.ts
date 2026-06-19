import { z } from "zod";
import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { publishAiQuestions } from "@/services/ai-generation.service";

const publishSchema = z.object({ generationId: z.string().uuid() });

export async function POST(request: Request) {
  return routeHandler(async () => {
    const parsed = publishSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await publishAiQuestions(await requireHost(), parsed.data.generationId));
  });
}

