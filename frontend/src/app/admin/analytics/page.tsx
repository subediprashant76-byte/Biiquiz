import { OrganizationShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, MetricStrip, ProgressBars } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type AnalyticsData = {
  kpis: Array<{ label: string; value: string | number }>;
  topics: Array<{ label: string; value: number; tone?: string }>;
  reports: Array<Array<string | number>>;
};
//
export default async function AnalyticsPage() {
  const { data, error } = await getApi<AnalyticsData>("/api/admin/analytics");
  return (
    <OrganizationShell
      title="Organization Analytics"
      subtitle="Learning intelligence"
      action={
        <LinkButton href="/admin/analytics/reports">
          Detailed reports
        </LinkButton>
      }
    >
      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      <MetricStrip items={data?.kpis ?? []} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">Topic mastery</h2>
            <div className="mt-6">
              <ProgressBars
                values={
                  data?.topics.length
                    ? data.topics
                    : [
                        {
                          label: "No answers yet",
                          value: 0,
                          tone: "bg-slate-300",
                        },
                      ]
                }
              />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">AI insight</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Algebraic fractions and photosynthesis equations are the highest
              recurring gaps this week. Schedule a 15-minute remediation quiz.
            </p>
            <LinkButton href="/admin/knowledge-gaps" className="mt-5 w-full">
              View knowledge gaps
            </LinkButton>
          </CardBody>
        </Card>
      </div>
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-xl font-black text-ink">Recent reports</h2>
          <DataTable
            columns={["Quiz", "Learners", "Accuracy", "Export"]}
            rows={data?.reports ?? []}
          />
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
