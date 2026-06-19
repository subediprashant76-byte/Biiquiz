import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { draftQuestionUpdateSchema } from "@/schemas/ai.schema";
import { updateDraftQuestion } from "@/services/ai-generation.service";

export async function PATCH(request: Request, context: { params: Promise<{ draftQuestionId: string }> }) {
  return routeHandler(async () => {
    const parsed = draftQuestionUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await updateDraftQuestion(await requireHost(), (await context.params).draftQuestionId, parsed.data));
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ draftQuestionId: string }> }) {
  return routeHandler(async () =>
    ok(await updateDraftQuestion(await requireHost(), (await context.params).draftQuestionId, { status: "deleted" }))
  );
}

