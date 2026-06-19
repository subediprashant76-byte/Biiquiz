import { notFound } from "next/navigation";
import { SuperAdminLayout } from "@/components/super-admin/super-admin-shell";
import { ErrorState } from "@/components/super-admin/super-admin-ui";
import { SuperAdminSection } from "@/components/super-admin/super-admin-sections";
import { getApi } from "@/lib/server-api";
import { parseSuperAdminPayload } from "@/services/super-admin.service";

export const dynamic = "force-dynamic";

const sections = new Set([
  "enterprises",
  "hosts",
  "students",
  "quizzes",
  "rooms",
  "analytics",
  "plans",
  "upgrade-requests",
  "payments",
  "domains",
  "ai-settings",
  "support",
  "audit-logs",
  "settings"
]);

export default async function SuperAdminSectionPage({
  params,
  searchParams
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  if (!sections.has(section)) notFound();
  const query = new URLSearchParams();
  const resolvedSearch = await searchParams;
  for (const [key, value] of Object.entries(resolvedSearch)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await getApi<unknown>(`/api/super-admin/${section}${suffix}`);
  let data: Record<string, unknown> = {};
  let error = response.error;
  if (!error && response.data) {
    try {
      data = parseSuperAdminPayload(response.data);
    } catch {
      error = "The Super Admin API returned an invalid response.";
    }
  }
  return (
    <SuperAdminLayout>
      {error ? <ErrorState message={error} /> : <SuperAdminSection section={section} data={data} />}
    </SuperAdminLayout>
  );
}
