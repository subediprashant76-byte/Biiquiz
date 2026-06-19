import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { saveAiGenerationSchema } from "@/schemas/ai.schema";
import { saveAiGeneration } from "@/services/ai-generation.service";

export async function POST(request: Request) {
  return routeHandler(async () => {
    const parsed = saveAiGenerationSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await saveAiGeneration(await requireHost(), parsed.data), { status: 201 });
  });
}

