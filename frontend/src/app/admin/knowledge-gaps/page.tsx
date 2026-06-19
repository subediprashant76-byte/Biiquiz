import { Brain, Sparkles } from "lucide-react";
import { OrganizationShell } from "@/components/layout/product-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBars, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type Gap = { topic: string; mastery: number; severity: string };
type GapsData = {
  stats: Array<{ label: string; value: string | number; tone?: "blue" | "green" | "orange" | "slate" }>;
  gaps: Gap[];
};

export default async function KnowledgeGapsPage() {
  const { data, error } = await getApi<GapsData>("/api/admin/knowledge-gaps");
  const gaps = data?.gaps ?? [];
  return (
    <OrganizationShell title="Automated Knowledge Gap Reports" subtitle="Remediation intelligence" action={<Button><Sparkles size={16} />Generate plan</Button>}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-4">
        {(data?.stats ?? []).map((stat) => <StatTile key={stat.label} {...stat} />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardBody>
            <Brain className="text-brand-600" />
            <h2 className="mt-3 text-xl font-black text-ink">Topic mastery heatmap</h2>
            <div className="mt-5"><ProgressBars values={gaps.map((gap) => ({ label: gap.topic, value: gap.mastery, tone: gap.mastery < 50 ? "bg-red-500" : gap.mastery < 65 ? "bg-warning-500" : "bg-success-500" }))} /></div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">AI recommendations</h2>
            <div className="mt-4 grid gap-3">
              {gaps.map((gap) => (
                <div key={gap.topic} className="rounded-xl border border-slate-200 p-3">
                  <Badge tone={gap.severity === "High" ? "red" : gap.severity === "Medium" ? "orange" : "green"}>{gap.severity}</Badge>
                  <p className="mt-2 font-black text-ink">{gap.topic}</p>
                  <p className="text-sm text-slate-600">Create a short targeted practice room.</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </OrganizationShell>
  );
}
