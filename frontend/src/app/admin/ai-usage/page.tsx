import { OrganizationShell } from "@/components/layout/product-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type AiUsage = {
  id: string;
  hostName: string;
  action: string;
  questionCount: number;
  model?: string | null;
  status: string;
};

export default async function AiUsagePage() {
  const { data: logs, error } = await getApi<AiUsage[]>("/api/admin/ai-usage");
  const rows = logs ?? [];
  return (
    <OrganizationShell title="AI Usage Log" subtitle="BYOK audit trail">
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Generations" value={rows.filter((row) => row.action === "generate").length} detail="All records" />
        <StatTile label="Success rate" value={`${rows.length ? Math.round(rows.filter((row) => row.status === "success").length / rows.length * 100) : 0}%`} detail="Across hosts" tone="green" />
        <StatTile label="Questions created" value={rows.reduce((total, row) => total + row.questionCount, 0)} detail="Saved as drafts" />
        <StatTile label="System status" value="Healthy" detail="No backend-owned keys" tone="green" />
      </div>
      <Card className="mt-6">
        <CardBody>
          <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">Users enter Gemini API keys in the frontend. The backend never stores Gemini keys.</p>
          <DataTable
            columns={["Host", "Action", "Volume", "Model", "Status"]}
            rows={rows.map((row) => [
              row.hostName,
              row.action,
              `${row.questionCount} questions`,
              row.model ?? "unknown",
              <Badge key={row.id} tone={row.status === "success" ? "green" : "red"}>{row.status}</Badge>
            ])}
          />
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
