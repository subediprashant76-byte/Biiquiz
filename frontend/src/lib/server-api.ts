import { headers } from "next/headers";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error?: { message?: string } };

export async function getApi<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  try {
    const response = await fetch(`${protocol}://${host}${path}`, {
      cache: "no-store",
      headers: { cookie: incoming.get("cookie") ?? "" }
    });
    const body = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || !body.ok) return { data: null, error: body.ok ? "Request failed." : body.error?.message ?? "Request failed." };
    return { data: body.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Request failed." };
  }
}

