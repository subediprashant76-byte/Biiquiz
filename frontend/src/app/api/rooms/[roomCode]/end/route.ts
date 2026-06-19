import { ok } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { endRoom } from "@/services/room.service";

export async function POST(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => ok(await endRoom(await requireHost(), (await context.params).roomCode)));
}

