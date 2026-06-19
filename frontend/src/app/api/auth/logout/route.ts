import { ok } from "@/lib/api-response";
import { clearSessionCookie } from "@/lib/auth";
import { routeHandler } from "@/lib/route";

export async function POST() {
  return routeHandler(async () => {
    await clearSessionCookie();
    return ok({ loggedOut: true });
  });
}

