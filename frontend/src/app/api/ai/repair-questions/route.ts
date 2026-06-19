import { z } from "zod";
import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { saveRepairedGeneration } from "@/services/ai-generation.service";

const repairSchema = z.object({
  generationId: z.string().uuid(),
  repairedJson: z.unknown()
});

export async function POST(request: Request) {
  return routeHandler(async () => {
    const parsed = repairSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await saveRepairedGeneration(await requireHost(), parsed.data.generationId, parsed.data.repairedJson));
  });
}

