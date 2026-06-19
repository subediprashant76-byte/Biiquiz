import { ok } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { nextQuestion } from "@/services/room.service";

export async function POST(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => ok(await nextQuestion(await requireHost(), (await context.params).roomCode)));
}

