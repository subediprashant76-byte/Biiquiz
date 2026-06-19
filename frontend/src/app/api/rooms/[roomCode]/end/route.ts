import { ok } from "@/lib/api-response";
import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { getRoomLeaderboard } from "@/services/leaderboard.service";
import { endRoom } from "@/services/room.service";

export async function POST(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => {
    const { roomCode } = await context.params;
    const room = await endRoom(await requireHost(), roomCode);
    return ok({ room, leaderboard: await getRoomLeaderboard(roomCode, null, true) });
  });
}
