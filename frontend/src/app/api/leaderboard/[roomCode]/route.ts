import { ok } from "@/lib/api-response";
import { routeHandler } from "@/lib/route";
import { getLeaderboard } from "@/services/leaderboard.service";

export async function GET(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => ok(await getLeaderboard((await context.params).roomCode)));
}

