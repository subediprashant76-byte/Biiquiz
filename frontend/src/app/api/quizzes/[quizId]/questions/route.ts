import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { questionSchema } from "@/schemas/question.schema";
import { createQuestion } from "@/services/question.service";

export async function POST(request: Request, context: { params: Promise<{ quizId: string }> }) {
  return routeHandler(async () => {
    const parsed = questionSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await createQuestion(await requireHost(), (await context.params).quizId, parsed.data), { status: 201 });
  });
}

