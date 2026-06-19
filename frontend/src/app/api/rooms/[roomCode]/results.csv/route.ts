import { requireHost } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { exportResultsCsv } from "@/services/room.service";

export async function GET(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  return routeHandler(async () => {
    const csv = await exportResultsCsv(await requireHost(), (await context.params).roomCode);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="biiquiz-results-${(await context.params).roomCode}.csv"`
      }
    });
  });
}

