"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimerRing } from "@/components/room/timer-ring";

type RoomData = {
  status: string;
  currentQuestionId: string | null;
  currentQuestionStartedAt: string | null;
  currentQuestionEndsAt: string | null;
  currentQuestion?: {
    id: string;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    marks: number;
  } | null;
};

type LeaderboardPayload = {
  quizStatus: string;
  leaderboard: Array<{
    rank: number;
    participantId: string;
    name: string;
    displayName: string;
    score: number;
    correct: number;
    correctCount: number;
    attempted: number;
    attemptedCount: number;
    totalQuestions: number;
    timeTakenSeconds: number;
    isCurrentUser: boolean;
  }>;
};

export function PlayRoom({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [message, setMessage] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submittedQuestionId, setSubmittedQuestionId] = useState<string | null>(null);
  const [visibleQuestionId, setVisibleQuestionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/rooms/${roomCode}`);
    const body = (await response.json()) as { ok: boolean; data?: RoomData };
    if (body.ok && body.data) {
      setRoom(body.data);
      if (body.data.status === "ended") {
        const leaderboardResponse = await fetch(`/api/leaderboard/${roomCode}`, { cache: "no-store" });
        const leaderboardBody = (await leaderboardResponse.json()) as { ok: boolean; data?: LeaderboardPayload };
        if (leaderboardBody.ok && leaderboardBody.data) setLeaderboard(leaderboardBody.data);
      }
      const nextQuestionId = body.data.currentQuestion?.id ?? null;
      if (nextQuestionId && nextQuestionId !== visibleQuestionId) {
        setVisibleQuestionId(nextQuestionId);
        setSelectedOption(null);
        setMessage("");
      }
    }
  }, [roomCode, visibleQuestionId]);

  async function submitAnswer() {
    if (!room?.currentQuestion?.id || !selectedOption) {
      setMessage("Select an answer before submitting.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const response = await fetch(`/api/rooms/${roomCode}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: room.currentQuestion.id, selectedOption })
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setSubmitting(false);
    if (body.ok) setSubmittedQuestionId(room.currentQuestion.id);
    setMessage(body.ok ? "Answer submitted." : body.error?.message ?? "Could not submit answer.");
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (!room || room.status === "waiting") {
    return <Card className="shadow-lifted"><CardBody><p className="text-lg font-bold text-ink">You are in the lobby. Waiting for the host to start.</p><p className="mt-2 text-sm text-slate-600">Keep this page open. The first question appears automatically.</p></CardBody></Card>;
  }

  if (room.status === "ended") {
    const rows = leaderboard?.leaderboard ?? [];
    const current = rows.find((row) => row.isCurrentUser);
    return (
      <Card className="overflow-hidden shadow-lifted">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-brand-600">Quiz ended</p>
              <h1 className="mt-1 text-2xl font-black text-ink">Final leaderboard is ready.</h1>
            </div>
            <Trophy className="text-warning-500" />
          </div>
          {current ? (
            <div className="mt-5 grid gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-black uppercase text-brand-700">Your rank</p>
                <p className="text-2xl font-black text-ink">#{current.rank}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-brand-700">Score</p>
                <p className="text-2xl font-black text-ink">{current.score}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-brand-700">Correct</p>
                <p className="text-2xl font-black text-ink">{current.correct}/{current.totalQuestions}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-brand-700">Attempted</p>
                <p className="text-2xl font-black text-ink">{current.attempted}</p>
              </div>
            </div>
          ) : null}
          <div className="mt-6 grid gap-2">
            {rows.map((row) => (
              <div
                key={row.participantId}
                className={row.isCurrentUser
                  ? "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-brand-300 bg-brand-50 p-3"
                  : "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-white text-sm font-black text-brand-700">#{row.rank}</span>
                <div>
                  <p className="font-black text-ink">{row.displayName}{row.isCurrentUser ? " (You)" : ""}</p>
                  <p className="text-xs font-semibold text-slate-500">{row.correct} correct · {row.attempted}/{row.totalQuestions} attempted · {row.timeTakenSeconds}s</p>
                </div>
                <p className="text-lg font-black text-ink">{row.score}</p>
              </div>
            ))}
            {rows.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm font-semibold text-slate-500">No submitted answers yet.</p> : null}
          </div>
        </CardBody>
      </Card>
    );
  }

  const question = room.currentQuestion;
  if (!question) return <Card><CardBody>Waiting for question...</CardBody></Card>;

  const options = [
    ["A", question.optionA],
    ["B", question.optionB],
    ["C", question.optionC],
    ["D", question.optionD]
  ];
  const submitted = submittedQuestionId === question.id;

  return (
    <Card className="overflow-hidden shadow-lifted">
      <div className="h-2 bg-slate-100">
        <div className="h-2 w-1/2 rounded-r-full bg-brand-600" />
      </div>
      <CardBody>
        <div className="mb-5 flex items-center justify-between gap-3">
          <Badge tone="blue">Room {roomCode}</Badge>
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">Question in progress</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-brand-600">{question.marks} marks</p>
            <h1 className="mt-2 text-2xl font-black leading-snug text-ink md:text-3xl">{question.questionText}</h1>
          </div>
          {room.currentQuestionStartedAt && room.currentQuestionEndsAt ? (
            <TimerRing startedAt={room.currentQuestionStartedAt} endsAt={room.currentQuestionEndsAt} />
          ) : null}
        </div>
        <div className="mt-8 grid gap-3">
          {options.map(([key, label]) => (
            <Button
              key={key}
              type="button"
              variant={selectedOption === key ? "primary" : "secondary"}
              size="lg"
              disabled={submitted || submitting}
              onClick={() => setSelectedOption(key)}
              className="justify-start text-left"
            >
              <span className={selectedOption === key ? "grid size-8 shrink-0 place-items-center rounded-lg bg-white/20 font-black text-white" : "grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 font-black text-brand-700"}>{key}</span>
              <span>{label}</span>
            </Button>
          ))}
        </div>
        {message ? <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{message}</p> : null}
        <div className="sticky bottom-3 mt-6">
          <Button size="lg" disabled={!selectedOption || submitted || submitting} className="w-full" onClick={submitAnswer}>
            {submitted ? "Answer submitted" : submitting ? "Submitting..." : "Submit answer"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
