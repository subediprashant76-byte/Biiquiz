"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Pause, Play, Settings, SkipForward, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/product";

type RoomState = {
  roomCode: string;
  roomName: string;
  status: string;
  currentQuestion?: { questionText: string; orderNumber: number } | null;
  participants?: Array<{ id: string; displayName: string; score: number; attemptedCount: number; joinedAt: string }>;
  _count: { participants: number };
};

type LeaderboardRow = {
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
  accuracyPercent: number;
};

type LeaderboardPayload = {
  roomId: string;
  quizId: string;
  quizStatus: string;
  leaderboard: LeaderboardRow[];
};

export function HostRoomControl({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [message, setMessage] = useState("");
  const joinLink = typeof window === "undefined" ? "" : `${window.location.origin}/join?room=${roomCode}`;

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/rooms/${roomCode}`);
    const body = (await response.json()) as { ok: boolean; data?: RoomState; error?: { message: string } };
    if (body.ok && body.data) setRoom(body.data);
    else setMessage(body.error?.message ?? "Could not load room.");
    const leaderboardResponse = await fetch(`/api/leaderboard/${roomCode}`, { cache: "no-store" });
    const leaderboardBody = (await leaderboardResponse.json()) as { ok: boolean; data?: LeaderboardPayload | LeaderboardRow[] };
    if (leaderboardBody.ok && leaderboardBody.data) {
      setLeaderboard(Array.isArray(leaderboardBody.data) ? leaderboardBody.data : leaderboardBody.data.leaderboard);
    }
  }, [roomCode]);

  async function action(name: "start" | "pause" | "next-question" | "end") {
    setMessage("");
    const response = await fetch(`/api/rooms/${roomCode}/${name}`, { method: "POST" });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setMessage(body.ok ? "Room updated." : body.error?.message ?? "Action failed.");
    await refresh();
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card className="shadow-lifted">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">Room code</p>
              <p className="text-5xl font-black tracking-normal text-ink">{roomCode}</p>
            </div>
            <Badge tone={room?.status === "active" ? "green" : "blue"}>{room?.status ?? "loading"}</Badge>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">Active question</p>
            <h2 className="mt-2 text-xl font-black leading-snug text-ink">{room?.currentQuestion?.questionText ?? "Waiting for current question."}</h2>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Responses update after participants submit answers.
            </p>
          </div>
          <div className="mt-6 hidden gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4">
            <Button onClick={() => action("start")}><Play size={16} />Start</Button>
            <Button variant="secondary" onClick={() => action("pause")}><Pause size={16} />Pause</Button>
            <Button variant="secondary" onClick={() => action("next-question")}><SkipForward size={16} />Next</Button>
            <Button variant="danger" onClick={() => action("end")}><Square size={16} />End</Button>
          </div>
          {message ? <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{message}</p> : null}
        </CardBody>
      </Card>
      <div className="grid content-start gap-5">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Participants</p>
              <p className="mt-2 text-4xl font-black text-ink">{room?._count.participants ?? 0}</p>
            </div>
            <Users className="text-brand-600" />
          </div>
          <div className="mt-5 lg:hidden">
            <Tabs items={["Responses", "Leaderboard", "Participants"]} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(joinLink)}><Copy size={16} />Copy join link</Button>
            <a className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold" href={`/api/rooms/${roomCode}/results.csv`}>
              <Download size={16} />
              CSV
            </a>
          </div>
          <div className="mt-5 grid gap-2">
            {(room?.participants ?? []).map((participant) => (
              <div key={participant.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-bold text-slate-700">{participant.displayName}</span>
                <span className="font-black text-ink">{participant.score} pts</span>
              </div>
            ))}
            {(room?.participants ?? []).length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-500">No participants have joined yet.</p>
            ) : null}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-ink">{room?.status === "ended" ? "Final locked leaderboard" : "Live leaderboard"}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black uppercase text-slate-500">
              {leaderboard.reduce((total, row) => total + row.attemptedCount, 0)} submitted
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            {leaderboard.map((row) => (
              <div key={row.participantId} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="grid size-8 place-items-center rounded-lg bg-white font-black text-brand-700">#{row.rank}</span>
                <div>
                  <p className="font-bold text-slate-700">{row.displayName}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {row.correctCount} correct · {row.attemptedCount}/{row.totalQuestions} attempted · {row.timeTakenSeconds}s
                  </p>
                </div>
                <span className="font-black text-ink">{row.score}</span>
              </div>
            ))}
            {leaderboard.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-4 text-center font-semibold text-slate-500">No scores yet.</p> : null}
          </div>
        </CardBody>
      </Card>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-2 border-t border-slate-200 bg-white p-3 shadow-lifted lg:hidden">
        <Button size="sm" variant="danger" onClick={() => action("end")}><Square size={15} />End</Button>
        <Button size="sm" variant="secondary" onClick={() => action("pause")}><Pause size={15} />Pause</Button>
        <Button size="sm" onClick={() => action("next-question")}><SkipForward size={15} />Next</Button>
        <Button size="sm" variant="ghost"><Settings size={15} />Settings</Button>
      </div>
    </div>
  );
}
