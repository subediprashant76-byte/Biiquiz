import { OrganizationShell } from "@/components/layout/product-shell";
import { Card, CardBody } from "@/components/ui/card";
import { AvatarName, DataTable, ProgressBars, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type HostAnalytics = {
  host: { name: string; email: string };
  stats: Array<{ label: string; value: string | number; detail?: string; tone?: "blue" | "green" | "orange" | "slate" }>;
  subjects: Array<{ label: string; value: number; tone?: string }>;
  recentRooms: Array<Array<string | number>>;
};

export default async function HostAnalyticsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const decoded = decodeURIComponent(userId);
  const { data, error } = await getApi<HostAnalytics>(`/api/admin/users/${encodeURIComponent(decoded)}/analytics`);
  return (
    <OrganizationShell title="Individual Host Analytics" subtitle={data?.host.email ?? decoded}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <AvatarName name={data?.host.name ?? "Host"} detail={data?.host.email ?? decoded} />
          <div className="grid grid-cols-3 gap-3 text-center">
            {(data?.stats ?? []).slice(0, 3).map((stat) => <StatTile key={stat.label} {...stat} />)}
          </div>
        </CardBody>
      </Card>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-xl font-black text-ink">Hosted quizzes</h2>
            <DataTable columns={["Quiz", "Participants", "Accuracy", "Status"]} rows={data?.recentRooms ?? []} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">Subject proficiency</h2>
            <div className="mt-5"><ProgressBars values={data?.subjects ?? []} /></div>
          </CardBody>
        </Card>
      </div>
    </OrganizationShell>
  );
}
