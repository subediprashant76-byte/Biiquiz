import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { quizUpdateSchema } from "@/schemas/quiz.schema";
import { deleteQuiz, getQuizForHost, updateQuiz } from "@/services/quiz.service";

export async function GET(_request: Request, context: { params: Promise<{ quizId: string }> }) {
  return routeHandler(async () => ok(await getQuizForHost(await requireHost(), (await context.params).quizId)));
}

export async function PATCH(request: Request, context: { params: Promise<{ quizId: string }> }) {
  return routeHandler(async () => {
    const parsed = quizUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await updateQuiz(await requireHost(), (await context.params).quizId, parsed.data));
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ quizId: string }> }) {
  return routeHandler(async () => ok(await deleteQuiz(await requireHost(), (await context.params).quizId)));
}

