import { ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { getAnalyticsOverview } from "@/services/admin.service";

export async function GET() {
  return routeHandler(async () => {
    await requireAdmin();
    return ok(await getAnalyticsOverview());
  });
}

