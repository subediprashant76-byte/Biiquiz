import { Save } from "lucide-react";
import { OrganizationShell } from "@/components/layout/product-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ProgressBars, Tabs } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type SettingsData = {
  organization: { name: string; slug: string; plan: string; brandingJson?: { primaryColor?: string } | null } | null;
  seatUsage: Array<{ label: string; value: number }>;
};

export default async function OrganizationSettingsPage() {
  const { data, error } = await getApi<SettingsData>("/api/admin/organization-settings");
  const organization = data?.organization;
  return (
    <OrganizationShell title="Organization Settings" subtitle="Branding and access" action={<Button><Save size={16} />Save changes</Button>}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[280px_1fr_360px]">
        <Card>
          <CardBody>
            <Tabs items={["General", "Branding", "Security", "Billing"]} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">Organization profile</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Organization name"><Input defaultValue={organization?.name ?? ""} /></Field>
              <Field label="Slug"><Input defaultValue={organization?.slug ?? ""} /></Field>
              <Field label="Primary color"><Input defaultValue={organization?.brandingJson?.primaryColor ?? "#1d4ed8"} /></Field>
              <Field label="Voice"><Select defaultValue="academic"><option value="academic">Academic precision</option><option value="vitality">Academic vitality</option></Select></Field>
            </div>
          </CardBody>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardBody>
              <h3 className="font-black text-ink">Seat utilization</h3>
              <div className="mt-4">
                <ProgressBars values={(data?.seatUsage ?? []).map((seat) => ({ label: seat.label, value: Math.min(100, seat.value * 10) }))} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-black text-ink">Current plan</h3>
              <p className="mt-2 text-3xl font-black text-brand-600">{organization?.plan ?? "No organization"}</p>
              <p className="mt-2 text-sm text-slate-600">500 participant rooms, branding, priority support.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </OrganizationShell>
  );
}
