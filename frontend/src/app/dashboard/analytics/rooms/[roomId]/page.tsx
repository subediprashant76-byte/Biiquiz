import { ArrowLeft, Download, Trophy } from "lucide-react";
import Link from "next/link";
import { WorkspaceShell } from "@/components/layout/product-shell";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, ProgressBars, StatTile } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type LeaderboardRow = {
  rank: number;
  participantId: string;
  displayName: string;
  score: number;
  correct: number;
  correctCount: number;
  wrongCount: number;
  attempted: number;
  attemptedCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
  submittedAt?: string | null;
};

type ParticipantRow = {
  participantId: string;
  name: string;
  joinedAt: string;
  status: "joined" | "submitted" | "completed";
  score: number;
  lastActivity: string;
};

type QuestionRow = {
  questionId: string;
  questionText: string;
  correctAnswer: string;
  correctPercentage: number;
  wrongPercentage: number;
  optionCounts: Record<"A" | "B" | "C" | "D", number>;
  mostSelectedWrongOption?: string | null;
  averageTimeSeconds: number;
  attempted: number;
};

type RoomAnalytics = {
  room: {
    id: string;
    roomCode: string;
    name: string;
    quizTitle: string;
    status: string;
    createdAt: string;
    hostName: string;
    totalQuestions: number;
    totalParticipants: number;
  };
  summary: {
    participants: number;
    completed: number;
    averageScore: number;
    averageAccuracy: number;
    highestScore: number;
    lowestScore: number;
    completionRate: number;
  };
  winner: LeaderboardRow | null;
  leaderboard: LeaderboardRow[];
  participants: ParticipantRow[];
  questions: QuestionRow[];
  insights: Array<{ title: string; detail: string }>;
};

export default async function RoomAnalyticsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const { data, error } = await getApi<RoomAnalytics>(`/api/host/analytics/rooms/${encodeURIComponent(roomId)}`);
  const room = data?.room;

  return (
    <WorkspaceShell
      mode="host"
      title={room?.name ?? "Room analytics"}
      subtitle={room ? `${room.quizTitle} · ${room.hostName}` : "Room result details"}
      action={
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/dashboard/analytics" variant="secondary"><ArrowLeft size={16} />Back</LinkButton>
          {room ? (
            <LinkButton href={`/api/rooms/${room.roomCode}/results.csv`} variant="secondary"><Download size={16} />Export CSV</LinkButton>
          ) : null}
        </div>
      }
    >
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {!data ? (
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-slate-600">Room analytics could not be loaded.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge tone={data.room.status === "ended" ? "green" : "blue"}>{data.room.status}</Badge>
                  <h1 className="mt-3 text-2xl font-black text-ink">{data.room.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.room.quizTitle} · Created {formatDate(data.room.createdAt)} · {data.room.totalQuestions} questions · {data.room.totalParticipants} participants
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  Room code <span className="ml-2 font-black text-ink">{data.room.roomCode}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <StatTile label="Participants" value={data.summary.participants} detail={`${data.summary.completed} completed`} tone="blue" />
            <StatTile label="Average score" value={data.summary.averageScore} detail="Across joined participants" tone="green" />
            <StatTile label="Average accuracy" value={`${data.summary.averageAccuracy}%`} detail="Correct submitted answers" tone="orange" />
            <StatTile label="Completion rate" value={`${data.summary.completionRate}%`} detail="Finished all questions" tone="slate" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
            <WinnerCard winner={data.winner} />
            <Card>
              <CardBody>
                <h2 className="text-xl font-black text-ink">Score range</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <StatTile label="Highest score" value={data.summary.highestScore} detail="Best participant score" tone="green" />
                  <StatTile label="Lowest score" value={data.summary.lowestScore} detail="Among attempted participants" tone="slate" />
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardBody>
              <h2 className="mb-4 text-xl font-black text-ink">Leaderboard</h2>
              <DataTable
                columns={["Rank", "Participant", "Score", "Correct", "Wrong", "Attempted", "Accuracy", "Time", "Submitted"]}
                rows={data.leaderboard.map((row) => [
                  `#${row.rank}`,
                  row.displayName,
                  row.score,
                  row.correctCount,
                  row.wrongCount,
                  `${row.attemptedCount}/${row.totalQuestions}`,
                  `${row.accuracyPercent}%`,
                  `${row.timeTakenSeconds}s`,
                  row.submittedAt ? formatDate(row.submittedAt) : "-"
                ])}
              />
              {!data.leaderboard.length ? <p className="py-8 text-center text-sm font-semibold text-slate-500">No results yet. Leaderboard will appear after students submit answers.</p> : null}
            </CardBody>
          </Card>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
            <Card>
              <CardBody>
                <h2 className="mb-4 text-xl font-black text-ink">Participants</h2>
                <DataTable
                  columns={["Participant", "Joined", "Status", "Score", "Last activity"]}
                  rows={data.participants.map((participant) => [
                    participant.name,
                    formatDate(participant.joinedAt),
                    <StatusBadge key={participant.participantId} status={participant.status} />,
                    participant.score,
                    formatDate(participant.lastActivity)
                  ])}
                />
                {!data.participants.length ? <p className="py-8 text-center text-sm font-semibold text-slate-500">No participants joined this room.</p> : null}
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h2 className="text-xl font-black text-ink">Insights</h2>
                <div className="mt-4 grid gap-3">
                  {data.insights.map((insight) => (
                    <div key={insight.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-black text-ink">{insight.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{insight.detail}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardBody>
              <h2 className="mb-4 text-xl font-black text-ink">Question analysis</h2>
              <div className="grid gap-4">
                {data.questions.map((question, index) => (
                  <div key={question.questionId} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-brand-600">Question {index + 1}</p>
                        <h3 className="mt-1 font-black leading-6 text-ink">{question.questionText}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                          Correct answer: {question.correctAnswer} · Most selected wrong: {question.mostSelectedWrongOption ?? "-"} · Avg time: {question.averageTimeSeconds}s
                        </p>
                      </div>
                      <Badge tone={question.correctPercentage >= 70 ? "green" : question.correctPercentage >= 40 ? "blue" : "red"}>
                        {question.correctPercentage}% correct
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <ProgressBars
                        values={(["A", "B", "C", "D"] as const).map((option) => ({
                          label: `Option ${option}`,
                          value: question.attempted ? Math.round((question.optionCounts[option] / question.attempted) * 100) : 0,
                          tone: option === question.correctAnswer ? "bg-success-500" : "bg-slate-400"
                        }))}
                      />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      Wrong percentage: {question.wrongPercentage}% · {question.attempted} submitted answer(s)
                    </p>
                  </div>
                ))}
                {!data.questions.length ? <p className="py-8 text-center text-sm font-semibold text-slate-500">No questions found for this room.</p> : null}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </WorkspaceShell>
  );
}

function WinnerCard({ winner }: { winner: LeaderboardRow | null }) {
  return (
    <Card>
      <CardBody>
        <Trophy className="text-warning-500" />
        <h2 className="mt-3 text-xl font-black text-ink">Winner</h2>
        {winner ? (
          <div className="mt-4 rounded-2xl bg-warning-50 p-4">
            <p className="text-xs font-black uppercase text-warning-700">Rank #{winner.rank}</p>
            <p className="mt-1 text-2xl font-black text-ink">{winner.displayName}</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {winner.score} points · {winner.correctCount} correct · {winner.attemptedCount}/{winner.totalQuestions} attempted · {winner.timeTakenSeconds}s
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            No results yet. Leaderboard will appear after students submit answers.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function StatusBadge({ status }: { status: ParticipantRow["status"] }) {
  const tone = status === "completed" ? "green" : status === "submitted" ? "blue" : "slate";
  return <Badge tone={tone}>{status}</Badge>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
