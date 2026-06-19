"use client";

import { useState } from "react";
import { MailPlus, ShieldCheck, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";

export function InviteUserForm() {
  const [role, setRole] = useState<"host" | "admin">("host");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: String(formData.get("email") ?? ""), role })
    });
    const body = await response.json() as { ok: boolean; error?: { message: string } };
    setMessage(body.ok ? "Invite created." : body.error?.message ?? "Could not create invite.");
    setLoading(false);
  }

  return (
    <Card className="shadow-lifted">
      <CardBody>
        <MailPlus className="text-brand-600" />
        <h2 className="mt-3 text-xl font-black text-ink">Send invitations</h2>
        <form action={submit} className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Email address"><Input name="email" type="email" required placeholder="teacher@example.com" /></Field>
          <Field label="Group"><Select name="group"><option>Organization</option></Select></Field>
          <button type="button" onClick={() => setRole("host")} className={role === "host" ? "rounded-xl border-2 border-brand-200 bg-brand-50 p-5 text-left" : "rounded-xl border border-slate-200 bg-white p-5 text-left"}>
            <UserRoundPlus className="text-brand-600" />
            <p className="mt-3 font-black text-ink">Host</p>
            <p className="text-sm text-slate-600">Can create quizzes and host live rooms.</p>
          </button>
          <button type="button" onClick={() => setRole("admin")} className={role === "admin" ? "rounded-xl border-2 border-brand-200 bg-brand-50 p-5 text-left" : "rounded-xl border border-slate-200 bg-white p-5 text-left"}>
            <ShieldCheck className="text-slate-500" />
            <p className="mt-3 font-black text-ink">Admin</p>
            <p className="text-sm text-slate-600">Can manage users, passes, analytics, and settings.</p>
          </button>
          {message ? <p className="md:col-span-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{message}</p> : null}
          <div className="md:col-span-2"><Button disabled={loading} size="lg">Send invite</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}
