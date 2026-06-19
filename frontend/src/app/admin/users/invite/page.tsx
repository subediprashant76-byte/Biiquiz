import { OrganizationShell } from "@/components/layout/product-shell";
import { Card, CardBody } from "@/components/ui/card";
import { ProgressBars } from "@/components/ui/product";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type SettingsData = { seatUsage: Array<{ label: string; value: number }> };

export default async function InviteUserPage() {
  const { data, error } = await getApi<SettingsData>("/api/admin/organization-settings");
  return (
    <OrganizationShell title="Invite User" subtitle="Host access">
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <InviteUserForm />
        <Card>
          <CardBody>
            <h3 className="font-black text-ink">Seat availability</h3>
            <div className="mt-4"><ProgressBars values={(data?.seatUsage ?? []).map((seat) => ({ label: seat.label, value: Math.min(100, seat.value * 10) }))} /></div>
            <p className="mt-4 rounded-xl bg-brand-50 p-4 text-sm font-semibold leading-6 text-brand-700">Invited users receive role-scoped access after accepting and creating a password.</p>
          </CardBody>
        </Card>
      </div>
    </OrganizationShell>
  );
}
