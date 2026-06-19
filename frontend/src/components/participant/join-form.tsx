"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export function JoinForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    const roomCode = String(formData.get("roomCode") ?? "").trim().toUpperCase();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const response = await fetch(`/api/rooms/${roomCode}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName })
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setLoading(false);
    if (!body.ok) {
      setMessage(body.error?.message ?? "Could not join room.");
      return;
    }
    router.push(`/play/${roomCode}`);
  }

  return (
    <Card className="mx-auto max-w-lg overflow-hidden border-t-4 border-t-brand-600 shadow-lifted">
      <CardBody>
        <form action={submit} className="grid gap-4">
          <Field label="Room code">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <Input name="roomCode" required placeholder="A7K2Q9" className="pl-10 text-center text-xl font-black uppercase tracking-[0.25em]" />
            </div>
          </Field>
          <Field label="Participant name">
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <Input name="displayName" required minLength={2} placeholder="Your display name" className="pl-10" />
            </div>
          </Field>
          {message ? <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">{message}</p> : null}
          <Button disabled={loading} size="lg">{loading ? "Joining..." : "Join quiz"}</Button>
        </form>
      </CardBody>
    </Card>
  );
}
