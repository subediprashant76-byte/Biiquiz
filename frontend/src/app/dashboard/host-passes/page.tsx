import { CheckCircle2, KeyRound, RadioTower, ShieldCheck, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatTile, UpgradeRequiredModal } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type HostPassData = {
  stats: Array<{ label: string; value: string | number; detail?: string }>;
  passes: Array<{ id: string; planName: string; participantLimit: number; validUntil: string; isActive: boolean }>;
};

export default async function HostPassPage() {
  const { data, error } = await getApi<HostPassData>("/api/host/host-passes");
  return (
    <WorkspaceShell
      mode="host"
      title="Host Pass"
      subtitle="Participant limit unlock"
      action={<LinkButton href="/pricing">Compare plans</LinkButton>}
    >
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {(data?.stats ?? []).map((stat, index) => <StatTile key={stat.label} {...stat} tone={index === 1 ? "green" : "blue"} />)}
        <StatTile label="Scoring" value="0 penalty" detail="Wrong, timeout, and no answer score 0" tone="slate" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="shadow-lifted">
          <CardBody>
            <KeyRound className="text-brand-600" />
            <h2 className="mt-3 text-2xl font-black text-ink">Use a Host Pass when your room needs more than 50 participants.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Hosts do not manage pass inventory from the admin console. Admins issue Host Passes, and hosts enter the pass code while creating a live room.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ["Create or open a quiz", "Prepare at least one multiple-choice question."],
                ["Create a live room", "Set participant limit above 50 only when needed."],
                ["Enter Host Pass code", "Paste the code in the room setup form."],
                ["Launch the room", "Share the room code or join link with participants."]
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
                  <CheckCircle2 className="text-success-500" size={18} />
                  <h3 className="mt-3 font-black text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/dashboard/quizzes/create"><RadioTower size={16} />Create quiz</LinkButton>
              <LinkButton href="/pricing" variant="secondary"><Users size={16} />View plans</LinkButton>
            </div>
            <div className="mt-6">
              <DataTable
                columns={["Plan", "Limit", "Valid until", "Status"]}
                rows={(data?.passes ?? []).map((pass) => [
                  pass.planName,
                  pass.participantLimit,
                  new Date(pass.validUntil).toLocaleDateString(),
                  <Badge key={pass.id} tone={pass.isActive ? "green" : "slate"}>{pass.isActive ? "Active" : "Inactive"}</Badge>
                ])}
              />
            </div>
          </CardBody>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardBody>
              <ShieldCheck className="text-brand-600" />
              <h3 className="mt-3 text-lg font-black text-ink">Access rule</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Admin pass management stays under `/admin/host-passes`. Host usage stays here and in room setup.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="blue">Host route</Badge>
                <Badge tone="green">Room setup</Badge>
              </div>
            </CardBody>
          </Card>
          <UpgradeRequiredModal mobile />
        </div>
      </div>
    </WorkspaceShell>
  );
}
