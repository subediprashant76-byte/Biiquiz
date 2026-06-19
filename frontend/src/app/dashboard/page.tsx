import { BookOpenCheck, RadioTower, Sparkles, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, SectionTitle, StatTile, UpgradeRequiredModal } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type DashboardData = {
  stats: Array<{ label: string; value: string | number; detail?: string }>;
  activeRooms: Array<{ roomCode: string; roomName: string; quizTitle: string; status: string; participants: number }>;
  draftsReady: Array<{ id: string; title: string; subject?: string; questions: number }>;
};

export default async function DashboardPage() {
  const { data, error } = await getApi<DashboardData>("/api/host/dashboard");
  const stats = data?.stats ?? [];
  return (
    <WorkspaceShell
      mode="host"
      title="Dashboard"
      subtitle="Host command center"
      action={<LinkButton href="/dashboard/quizzes/create">Create quiz</LinkButton>}
    >
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatTile key={stat.label} {...stat} tone={index === 2 ? "green" : "blue"} />
        ))}
        {stats.length === 0 ? <StatTile label="No data" value="0" detail="Create a quiz to populate your dashboard." tone="slate" /> : null}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle title="Action required" text="You have quiz drafts that are ready to review before hosting." />
                <LinkButton href="/dashboard/quizzes/create" variant="secondary">New quiz</LinkButton>
              </div>
              {data?.draftsReady.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {data.draftsReady.map((quiz) => <Quick key={quiz.id} href={`/dashboard/quizzes/${quiz.id}/edit`} icon={BookOpenCheck} title={quiz.title} text={`${quiz.questions} questions ready for review.`} />)}
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Quick href="/dashboard/quizzes/create" icon={BookOpenCheck} title="Create quiz" text="Set title, subject, marks, and timers." />
                  <Quick href="/dashboard/explore" icon={Users} title="Explore library" text="Copy proven quiz templates." />
                  <Quick href="/dashboard/host-passes" icon={RadioTower} title="Host Pass" text="Unlock rooms over 50 participants." />
                </div>
              )}
            </CardBody>
          </Card>
          {data?.activeRooms.length ? (
            <Card>
              <CardBody>
                <SectionTitle title="Active live rooms" text="Open a room to continue hosting." />
                <div className="mt-4 grid gap-3">
                  {data.activeRooms.map((room) => (
                    <LinkButton key={room.roomCode} href={`/host/room/${room.roomCode}`} variant="secondary" className="justify-between">
                      {room.roomName}
                      <span>{room.participants} joined</span>
                    </LinkButton>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : <EmptyState title="No active live rooms" text="Create a room from any quiz when students are ready. Room controls and the join code will appear here." actionHref="/dashboard/quizzes/create" actionLabel="Create quiz" />}
        </div>
        <div className="grid gap-6">
          <Card>
            <CardBody>
              <Sparkles className="text-brand-600" />
              <h2 className="mt-3 text-xl font-black text-ink">Quick AI Gen</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use your own Gemini key from the browser to draft questions without storing secrets on the backend.</p>
              <LinkButton href="/dashboard/quizzes/create" className="mt-5 w-full">Start from a quiz</LinkButton>
            </CardBody>
          </Card>
          <UpgradeRequiredModal mobile />
        </div>
      </div>
    </WorkspaceShell>
  );
}

function Quick({ href, icon: Icon, title, text }: { href: string; icon: React.ElementType; title: string; text: string }) {
  return (
    <Card className="shadow-none">
      <CardBody className="p-4">
        <Icon className="text-brand-600" />
        <h2 className="mt-4 font-black text-ink">{title}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{text}</p>
        <LinkButton href={href} variant="secondary" className="mt-4 w-full">Open</LinkButton>
      </CardBody>
    </Card>
  );
}
