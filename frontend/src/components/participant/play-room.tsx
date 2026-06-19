"use client";

import { useEffect, useState } from "react";
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

export function PlayRoom({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/rooms/${roomCode}`);
    const body = (await response.json()) as { ok: boolean; data?: RoomData };
    if (body.ok && body.data) {
      setRoom(body.data);
      setSubmitted(false);
    }
  }

  async function answer(selectedOption: string) {
    if (!room?.currentQuestion?.id) return;
    const response = await fetch(`/api/rooms/${roomCode}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: room.currentQuestion.id, selectedOption })
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setSubmitted(body.ok);
    setMessage(body.ok ? "Answer submitted." : body.error?.message ?? "Could not submit answer.");
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, []);

  if (!room || room.status === "waiting") {
    return <Card className="shadow-lifted"><CardBody><p className="text-lg font-bold text-ink">You are in the lobby. Waiting for the host to start.</p><p className="mt-2 text-sm text-slate-600">Keep this page open. The first question appears automatically.</p></CardBody></Card>;
  }

  if (room.status === "ended") {
    return <Card className="shadow-lifted"><CardBody><p className="text-lg font-bold text-ink">Quiz ended. Check the leaderboard for final results.</p></CardBody></Card>;
  }

  const question = room.currentQuestion;
  if (!question) return <Card><CardBody>Waiting for question...</CardBody></Card>;

  const options = [
    ["A", question.optionA],
    ["B", question.optionB],
    ["C", question.optionC],
    ["D", question.optionD]
  ];

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
            <Button key={key} type="button" variant="secondary" size="lg" disabled={submitted} onClick={() => answer(key)} className="justify-start text-left">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 font-black text-brand-700">{key}</span>
              <span>{label}</span>
            </Button>
          ))}
        </div>
        {message ? <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{message}</p> : null}
        <div className="sticky bottom-3 mt-6">
          <Button size="lg" disabled className="w-full opacity-80">Submit answer after selecting an option</Button>
        </div>
      </CardBody>
    </Card>
  );
}
