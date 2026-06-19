import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { quizCreateSchema } from "@/schemas/quiz.schema";
import { createQuiz, listQuizzes } from "@/services/quiz.service";

export async function GET() {
  return routeHandler(async () => ok(await listQuizzes(await requireHost())));
}

export async function POST(request: Request) {
  return routeHandler(async () => {
    const user = await requireHost();
    const parsed = quizCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await createQuiz(user, parsed.data), { status: 201 });
  });
}

