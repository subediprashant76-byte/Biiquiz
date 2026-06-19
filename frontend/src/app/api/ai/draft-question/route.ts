import { z } from "zod";
import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { questionSchema } from "@/schemas/question.schema";
import { addDraftQuestion } from "@/services/ai-generation.service";

const addDraftSchema = z.object({
  generationId: z.string().uuid(),
  question: questionSchema
});

export async function POST(request: Request) {
  return routeHandler(async () => {
    const parsed = addDraftSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await addDraftQuestion(await requireHost(), parsed.data.generationId, parsed.data.question), { status: 201 });
  });
}
