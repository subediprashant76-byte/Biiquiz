"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RadioTower, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { UpgradeRequiredModal } from "@/components/ui/product";

export function CreateRoomForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    const payload = {
      quizId,
      roomName: formData.get("roomName"),
      participantLimit: Number(formData.get("participantLimit")),
      hostPassCode: formData.get("hostPassCode"),
      scoringMode: formData.get("scoringMode"),
      showLeaderboard: formData.get("showLeaderboard") === "on",
      showCorrectAnswer: formData.get("showCorrectAnswer") === "on"
    };
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as { ok: boolean; data?: { roomCode: string }; error?: { message: string } };
    setLoading(false);
    if (!body.ok || !body.data) {
      setMessage(body.error?.message ?? "Could not create room.");
      return;
    }
    router.push(`/host/room/${body.data.roomCode}`);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Card className="shadow-lifted">
        <CardBody>
          <form action={submit} className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="text-xl font-black text-ink">Session setup</h2>
              <p className="mt-1 text-sm text-slate-600">Configure participant limits, Host Pass unlock, leaderboard visibility, and scoring mode.</p>
            </div>
            <Field label="Room name">
              <Input name="roomName" required minLength={2} placeholder="Grade 10 Friday Practice" />
            </Field>
            <Field label="Participant limit">
              <Input name="participantLimit" type="number" min={1} max={500} defaultValue={50} />
            </Field>
            <Field label="Host Pass code" hint="Required only above 50 participants.">
              <Input name="hostPassCode" placeholder="Optional" />
            </Field>
            <Field label="Scoring mode">
              <Select name="scoringMode" defaultValue="simple">
                <option value="simple">Simple</option>
                <option value="speed_bonus">Speed bonus</option>
              </Select>
            </Field>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
              <input name="showLeaderboard" type="checkbox" defaultChecked />
              Show leaderboard
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
              <input name="showCorrectAnswer" type="checkbox" />
              Show correct answer after each question
            </label>
            {message ? <p className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
            <div className="md:col-span-2">
              <Button disabled={loading} size="lg"><RadioTower size={17} />{loading ? "Creating..." : "Create live room"}</Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <div className="grid gap-4">
        <Card>
          <CardBody>
            <Users className="text-brand-600" />
            <h3 className="mt-3 text-lg font-black text-ink">Session preview</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              {["Room code generated after create", "Participants join without accounts", "CSV export available after session"].map((item) => (
                <span key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success-500" />{item}</span>
              ))}
            </div>
          </CardBody>
        </Card>
        <UpgradeRequiredModal mobile />
      </div>
    </div>
  );
}
