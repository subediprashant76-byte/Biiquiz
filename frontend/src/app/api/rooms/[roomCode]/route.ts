import { ok } from "@/lib/api-response";
import { routeHandler } from "@/lib/route";
import { getRoom } from "@/services/room.service";

export async function GET(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => ok(await getRoom((await context.params).roomCode)));
}

