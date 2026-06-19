"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Pause, Play, Settings, SkipForward, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBars, Tabs } from "@/components/ui/product";

type RoomState = {
  roomCode: string;
  roomName: string;
  status: string;
  currentQuestion?: { questionText: string; orderNumber: number } | null;
  _count: { participants: number };
};

export function HostRoomControl({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [message, setMessage] = useState("");
  const joinLink = typeof window === "undefined" ? "" : `${window.location.origin}/join?room=${roomCode}`;

  async function refresh() {
    const response = await fetch(`/api/rooms/${roomCode}`);
    const body = (await response.json()) as { ok: boolean; data?: RoomState; error?: { message: string } };
    if (body.ok && body.data) setRoom(body.data);
    else setMessage(body.error?.message ?? "Could not load room.");
  }

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
  }, []);

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
            <h2 className="mt-2 text-2xl font-black text-ink">{room?.currentQuestion?.questionText ?? "Waiting for current question."}</h2>
            <div className="mt-5">
              <ProgressBars values={[
                { label: "Option A", value: 42 },
                { label: "Option B", value: 18 },
                { label: "Option C", value: 31, tone: "bg-success-500" },
                { label: "Option D", value: 9 }
              ]} />
            </div>
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
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="font-black text-ink">Top 5 leaderboard</h3>
          <div className="mt-4 grid gap-2 text-sm">
            {["Riya", "Kiran", "Maya", "Pratik", "Asha"].map((name, index) => (
              <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-bold text-slate-700">#{index + 1} {name}</span>
                <span className="font-black text-ink">{980 - index * 80}</span>
              </div>
            ))}
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
