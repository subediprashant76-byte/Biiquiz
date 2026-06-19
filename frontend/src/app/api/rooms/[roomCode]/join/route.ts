import { ok, validationFail } from "@/lib/api-response";
import { routeHandler } from "@/lib/route";
import { joinRoomSchema } from "@/schemas/room.schema";
import { joinRoom } from "@/services/room.service";

export async function POST(request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => {
    const parsed = joinRoomSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await joinRoom((await context.params).roomCode, parsed.data), { status: 201 });
  });
}

