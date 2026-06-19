import { SuperAdminLayout } from "@/components/super-admin/super-admin-shell";
import { ErrorState } from "@/components/super-admin/super-admin-ui";
import { SuperAdminSection } from "@/components/super-admin/super-admin-sections";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const { data, error } = await getApi<Record<string, unknown>>("/api/super-admin/dashboard");
  return (
    <SuperAdminLayout>
      {error ? <ErrorState message={error} /> : <SuperAdminSection section="dashboard" data={data ?? {}} />}
    </SuperAdminLayout>
  );
}
