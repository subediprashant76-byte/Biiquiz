import { NextResponse } from "next/server";

/**
 * Send sign-in directly to Django. The frontend still has legacy Prisma API
 * handlers, so relying only on a Next rewrite can send this request to the
 * wrong auth stack and produce tenant-domain errors.
 */
export async function POST(request: Request) {
  const djangoApiUrl = process.env.DJANGO_API_URL?.replace(/\/$/, "");
  if (!djangoApiUrl) {
    return NextResponse.json(
      { ok: false, error: { message: "Login service is not configured." } },
      { status: 503 }
    );
  }

  try {
    const upstream = await fetch(`${djangoApiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
      cache: "no-store"
    });
    const headers = new Headers({
      "content-type": upstream.headers.get("content-type") ?? "application/json"
    });
    const cookie = upstream.headers.get("set-cookie");
    if (cookie) headers.set("set-cookie", cookie);

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Could not reach the login service." } },
      { status: 502 }
    );
  }
}
