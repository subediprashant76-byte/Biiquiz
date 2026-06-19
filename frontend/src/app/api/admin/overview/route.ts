import { ok } from "@/lib/api-response";
import { requireOrganizationAdmin } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { getAdminOverview } from "@/services/admin.service";

export async function GET() {
  return routeHandler(async () => {
    await requireOrganizationAdmin();
    return ok(await getAdminOverview());
  });
}
