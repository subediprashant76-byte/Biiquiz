import { ok, validationFail } from "@/lib/api-response";
import { routeHandler } from "@/lib/route";
import { registerSchema } from "@/schemas/auth.schema";
import { registerHost } from "@/services/auth.service";

export async function POST(request: Request) {
  return routeHandler(async () => {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await registerHost(parsed.data));
  });
}

