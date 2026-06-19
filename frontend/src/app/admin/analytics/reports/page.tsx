import { Download, Filter } from "lucide-react";
import { OrganizationShell } from "@/components/layout/product-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, MetricStrip, ProgressBars } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type ReportsData = {
  kpis: Array<{ label: string; value: string | number }>;
  reports: Array<Array<string | number>>;
};

export default async function DetailedReportsPage() {
  const { data, error } = await getApi<ReportsData>("/api/admin/analytics/reports");
  return (
    <OrganizationShell title="Detailed Analytics Reports" subtitle="Exports and drilldowns" action={<Button><Download size={16} />Export</Button>}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <MetricStrip items={data?.kpis ?? []} />
      <Card className="mt-6">
        <CardBody>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">Report filters</h2>
            <Button variant="secondary"><Filter size={16} />Filters</Button>
          </div>
          <DataTable columns={["Quiz", "Learners", "Accuracy", "Export"]} rows={data?.reports ?? []} />
        </CardBody>
      </Card>
      <Card className="mt-6">
        <CardBody>
          <h2 className="text-xl font-black text-ink">Mobile KPI view</h2>
          <div className="mt-5"><ProgressBars values={[{ label: "Completions", value: 91 }, { label: "Accuracy", value: 78 }, { label: "At risk topics", value: 34, tone: "bg-warning-500" }]} /></div>
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
