import { ok, validationFail } from "@/lib/api-response";
import { requireOrganizationAdmin } from "@/lib/auth";
import { routeHandler } from "@/lib/route";
import { hostPassCreateSchema } from "@/schemas/host-pass.schema";
import { createHostPass, listHostPasses } from "@/services/host-pass.service";

export async function GET() {
  return routeHandler(async () => {
    await requireOrganizationAdmin();
    return ok(await listHostPasses());
  });
}

export async function POST(request: Request) {
  return routeHandler(async () => {
    const admin = await requireOrganizationAdmin();
    const parsed = hostPassCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await createHostPass(admin, parsed.data), { status: 201 });
  });
}
