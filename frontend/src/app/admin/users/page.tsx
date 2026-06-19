import { Search, UserPlus } from "lucide-react";
import { OrganizationShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarName, DataTable, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  rooms: number;
  plan: string;
  organization?: { name: string } | null;
};

export default async function AdminUsersPage() {
  const { data: users, error } = await getApi<AdminUser[]>("/api/admin/users");
  const rows = users ?? [];
  return (
    <OrganizationShell title="Host User Management" subtitle="People and access" action={<LinkButton href="/admin/users/invite"><UserPlus size={16} />Invite user</LinkButton>}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Total hosts" value={rows.filter((user) => user.role === "host").length} detail="Across organizations" />
        <StatTile label="Admins" value={rows.filter((user) => user.role === "admin").length} detail="Organization operators" tone="green" />
        <StatTile label="Inactive users" value={rows.filter((user) => !user.isActive).length} detail="Paused access" tone="orange" />
      </div>
      <Card className="mt-6">
        <CardBody>
          <div className="mb-5 flex flex-wrap gap-3">
            <div className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
              <Search size={17} />
              Search hosts
            </div>
            <LinkButton href="/admin/users/invite" variant="secondary">Invite</LinkButton>
          </div>
          <DataTable
            columns={["User", "Role", "Status", "Rooms", "Plan", "Actions"]}
            rows={rows.map((user) => [
              <AvatarName key={user.email} name={user.name} detail={user.email} />,
              user.role,
              <Badge key={user.email} tone={user.isActive ? "green" : "slate"}>{user.isActive ? "Active" : "Paused"}</Badge>,
              user.rooms,
              user.plan,
              <LinkButton key="analytics" href={`/admin/users/${encodeURIComponent(user.id)}/analytics`} variant="secondary" size="sm">Analytics</LinkButton>
            ])}
          />
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
