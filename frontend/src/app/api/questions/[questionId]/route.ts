import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { questionUpdateSchema } from "@/schemas/question.schema";
import { deleteQuestion, updateQuestion } from "@/services/question.service";

export async function PATCH(request: Request, context: { params: Promise<{ questionId: string }> }) {
  return routeHandler(async () => {
    const parsed = questionUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await updateQuestion(await requireHost(), (await context.params).questionId, parsed.data));
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ questionId: string }> }) {
  return routeHandler(async () => ok(await deleteQuestion(await requireHost(), (await context.params).questionId)));
}

