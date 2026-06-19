import { BarChart3, Download, TrendingUp } from "lucide-react";
import Link from "next/link";
import { WorkspaceShell } from "@/components/layout/product-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, ProgressBars, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type HostAnalytics = {
  stats: Array<{ label: string; value: string | number; detail?: string; tone?: "blue" | "green" | "orange" | "slate" }>;
  subjects: Array<{ label: string; value: number; tone?: string }>;
  recentRooms: Array<Array<string | number>>;
  recentRoomDetails?: Array<{
    id: string;
    roomName: string;
    quizTitle: string;
    participants: number;
    accuracy: string;
    status: string;
    createdAt: string;
  }>;
};

export default async function HostAnalyticsPage() {
  const { data, error } = await getApi<HostAnalytics>("/api/host/analytics");
  const lowestSubject = data?.subjects.length
    ? [...data.subjects].sort((left, right) => left.value - right.value)[0]
    : null;
  const nextAction = lowestSubject
    ? `${lowestSubject.label} is currently at ${lowestSubject.value}% accuracy. Review those questions and create a short follow-up quiz before the next live room.`
    : "Host a live room and collect answers to unlock subject-specific recommendations.";
  const roomRows = data?.recentRoomDetails?.length
    ? data.recentRoomDetails.map((room) => [
        <Link key={room.id} href={`/dashboard/analytics/rooms/${room.id}`} className="font-black text-brand-700 underline-offset-4 hover:underline">
          {room.roomName}
          <span className="block text-xs font-semibold text-slate-500">{room.quizTitle}</span>
        </Link>,
        room.participants,
        room.accuracy,
        room.status
      ])
    : data?.recentRooms ?? [];
  return (
    <WorkspaceShell
      mode="host"
      title="My Analytics"
      subtitle="Host performance"
      action={<Button variant="secondary"><Download size={16} />Export</Button>}
    >
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-4">
        {(data?.stats ?? []).map((stat, index) => <StatTile key={stat.label} {...stat} tone={stat.tone ?? (index === 2 ? "green" : "blue")} />)}
        {!data?.stats.length ? <StatTile label="No analytics" value="0" detail="Host a room to collect analytics." tone="slate" /> : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardBody>
            <BarChart3 className="text-brand-600" />
            <h2 className="mt-3 text-xl font-black text-ink">Subject performance</h2>
            <div className="mt-5">
              <ProgressBars values={data?.subjects.length ? data.subjects : [{ label: "No answers yet", value: 0, tone: "bg-slate-300" }]} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <TrendingUp className="text-success-500" />
            <h2 className="mt-3 text-xl font-black text-ink">Next best action</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {nextAction}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-xl font-black text-ink">Recent rooms</h2>
          <DataTable
            columns={["Room", "Participants", "Accuracy", "Status"]}
            rows={roomRows}
          />
        </CardBody>
      </Card>
    </WorkspaceShell>
  );
}
