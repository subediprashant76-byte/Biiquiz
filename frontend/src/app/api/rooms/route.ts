import { ok, validationFail } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { createRoomSchema } from "@/schemas/room.schema";
import { createRoom } from "@/services/room.service";

export async function POST(request: Request) {
  return routeHandler(async () => {
    const parsed = createRoomSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await createRoom(await requireHost(), parsed.data), { status: 201 });
  });
}

