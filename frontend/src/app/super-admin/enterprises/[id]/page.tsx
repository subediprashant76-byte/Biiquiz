import { SuperAdminLayout } from "@/components/super-admin/super-admin-shell";
import { ErrorState } from "@/components/super-admin/super-admin-ui";
import { EnterpriseDetail } from "@/components/super-admin/super-admin-sections";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function SuperAdminEnterpriseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const { data, error } = await getApi<Record<string, unknown>>(`/api/super-admin/enterprises/${encodeURIComponent(id)}?tab=${encodeURIComponent(tab)}`);
  return (
    <SuperAdminLayout>
      {error ? <ErrorState message={error} /> : <EnterpriseDetail data={data ?? {}} />}
    </SuperAdminLayout>
  );
}
