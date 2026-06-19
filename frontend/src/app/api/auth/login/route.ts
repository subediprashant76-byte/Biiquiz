import { ok, validationFail } from "@/lib/api-response";
import { routeHandler } from "@/lib/route";
import { loginSchema } from "@/schemas/auth.schema";
import { login } from "@/services/auth.service";

export async function POST(request: Request) {
  return routeHandler(async () => {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return validationFail(parsed.error.issues[0]?.message);
    return ok(await login(parsed.data));
  });
}

