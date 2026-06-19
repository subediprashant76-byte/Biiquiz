import { MessageSquareWarning, ShieldAlert } from "lucide-react";
import { OrganizationShell } from "@/components/layout/product-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, ProgressBars, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type ProctoringData = {
  stats: Array<{ label: string; value: string | number; tone?: "blue" | "green" | "orange" | "slate" }>;
  distribution: Array<{ label: string; value: number; tone?: string }>;
  alerts: Array<{ student: string; issue: string; action: string }>;
};

export default async function ProctoringPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const { data, error } = await getApi<ProctoringData>(`/api/admin/proctoring/${roomCode}`);
  return (
    <OrganizationShell title="Live Proctoring Intervention" subtitle={`Room ${roomCode}`}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-4">
        {(data?.stats ?? []).map((stat) => <StatTile key={stat.label} {...stat} />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardBody>
            <ShieldAlert className="text-warning-500" />
            <h2 className="mt-3 text-xl font-black text-ink">Question distribution</h2>
            <div className="mt-5"><ProgressBars values={data?.distribution ?? []} /></div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <MessageSquareWarning className="text-brand-600" />
            <h2 className="mt-3 text-xl font-black text-ink">Intervention tools</h2>
            <div className="mt-4 grid gap-2">
              <Button variant="secondary">Send reminder</Button>
              <Button variant="secondary">Pause room</Button>
              <Button>Extend timer</Button>
            </div>
          </CardBody>
        </Card>
      </div>
      <Card className="mt-6">
        <CardBody>
          <DataTable columns={["Student", "Issue", "Recommended action"]} rows={(data?.alerts ?? []).map((item) => [item.student, item.issue, item.action])} />
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
