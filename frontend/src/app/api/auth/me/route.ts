import { ok } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth";
import { routeHandler } from "@/lib/route";

export async function GET() {
  return routeHandler(async () => ok({ user: await getSessionUser() }));
}

