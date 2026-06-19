import { Plus } from "lucide-react";
import { OrganizationShell } from "@/components/layout/product-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type Pass = {
  id: string;
  planName: string;
  participantLimit: number;
  validUntil: string;
  isActive: boolean;
  assignedHostId?: string | null;
  assignedOrganizationId?: string | null;
};

export default async function HostPassesPage() {
  const { data: passes, error } = await getApi<Pass[]>("/api/admin/host-passes");
  const rows = passes ?? [];
  return (
    <OrganizationShell title="Host Pass Management" subtitle="Participant limit unlocks" action={<Button><Plus size={16} />Create pass</Button>}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Active passes" value={rows.filter((pass) => pass.isActive).length} detail="Currently assignable" />
        <StatTile label="Seats unlocked" value={rows.reduce((total, pass) => total + pass.participantLimit, 0)} detail="Across organizations" tone="green" />
        <StatTile label="Expiring soon" value={rows.filter((pass) => new Date(pass.validUntil).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000).length} detail="Next 30 days" tone="orange" />
        <StatTile label="Unassigned" value={rows.filter((pass) => !pass.assignedHostId && !pass.assignedOrganizationId).length} detail="Ready to assign" tone="slate" />
      </div>
      <Card className="mt-6">
        <CardBody>
          <DataTable
            columns={["Pass", "Plan", "Owner", "Limit", "Valid until", "Status"]}
            rows={rows.map((pass) => [
              pass.id.slice(0, 8),
              pass.planName,
              pass.assignedHostId ? "Host" : pass.assignedOrganizationId ? "Organization" : "Global",
              pass.participantLimit,
              new Date(pass.validUntil).toLocaleDateString(),
              <Badge key={pass.id} tone={pass.isActive ? "green" : "slate"}>{pass.isActive ? "Active" : "Inactive"}</Badge>
            ])}
          />
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
