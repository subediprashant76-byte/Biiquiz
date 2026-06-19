import { LinkButton } from "@/components/ui/button";
import { OrganizationShell } from "@/components/layout/product-shell";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, MetricStrip, ProgressBars } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

const routeCards = [
  { href: "/admin/analytics/reports", title: "Detailed reports" },
  { href: "/admin/proctoring/DEMO1A", title: "Live proctoring" },
  { href: "/admin/knowledge-gaps", title: "Knowledge gaps" },
  { href: "/admin/workspace", title: "Organization workspace" }
];

type OverviewData = {
  metrics: Array<{ label: string; value: string | number }>;
  aiUsageTrend: Array<{ label: string; value: number; tone?: string }>;
  activity: Array<Array<string>>;
};

export default async function AdminPage() {
  const { data, error } = await getApi<OverviewData>("/api/admin/overview");
  return (
    <OrganizationShell title="Organization Overview" subtitle="Organization command center">
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <MetricStrip items={data?.metrics ?? []} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">AI usage trend</h2>
            <div className="mt-6">
              <ProgressBars values={(data?.aiUsageTrend ?? []).map((item) => ({ ...item, value: Math.min(100, item.value) }))} />
            </div>
          </CardBody>
        </Card>
        <Card className="bg-brand-600 text-white">
          <CardBody>
            <h2 className="text-xl font-black">Host Pass control</h2>
            <p className="mt-2 text-sm leading-6 text-brand-100">Issue, assign, and audit participant limit unlocks for schools and organization teams.</p>
            <LinkButton href="/admin/host-passes" className="mt-5 bg-white text-ink hover:bg-slate-100">Manage passes</LinkButton>
          </CardBody>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {routeCards.map((card) => (
          <LinkButton key={card.href} href={card.href} variant="secondary" className="justify-start p-5">
            {card.title}
          </LinkButton>
        ))}
      </div>
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-xl font-black text-ink">Recent activity</h2>
          <DataTable
            columns={["Actor", "Action", "Entity", "When"]}
            rows={data?.activity ?? []}
          />
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
