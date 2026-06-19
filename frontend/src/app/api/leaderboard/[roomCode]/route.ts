import { ok } from "@/lib/api-response";
import { getParticipantToken } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { getRoomLeaderboard } from "@/services/leaderboard.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => {
    const { roomCode } = await context.params;
    return ok(await getRoomLeaderboard(roomCode, await getParticipantToken(roomCode)));
  });
}
