import { fail, ok, validationFail } from "@/lib/api-response";
import { getParticipantToken } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { answerSchema } from "@/schemas/room.schema";
import { submitAnswer } from "@/services/room.service";

export async function POST(request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => {
    const { roomCode } = await context.params;
    const token = await getParticipantToken(roomCode);
    if (!token) return fail("UNAUTHORIZED", "Join the room before answering.", 401);
    const parsed = answerSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await submitAnswer(roomCode, token, parsed.data));
  });
}

