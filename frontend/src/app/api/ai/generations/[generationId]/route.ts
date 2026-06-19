import { ok } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { getAiGeneration } from "@/services/ai-generation.service";

export async function GET(_request: Request, context: { params: Promise<{ generationId: string }> }) {
  return routeHandler(async () => ok(await getAiGeneration(await requireHost(), (await context.params).generationId)));
}

