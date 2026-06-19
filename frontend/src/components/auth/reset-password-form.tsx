"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export function ResetPasswordForm({ email = "", code = "" }: { email?: string; code?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    const payload = Object.fromEntries(formData);
    if (payload.password !== payload.confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match.");
      return;
    }
    delete payload.confirmPassword;
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setLoading(false);
    if (!body.ok) {
      setMessage(body.error?.message ?? "Could not reset password.");
      return;
    }
    setMessage("Password reset. Redirecting to login...");
    window.setTimeout(() => router.push("/login"), 900);
  }

  return (
    <Card className="mx-auto max-w-md shadow-lifted">
      <CardBody>
        <form action={submit} className="grid gap-4">
          <Field label="Account email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input name="email" type="email" required defaultValue={email} className="pl-10" />
            </div>
          </Field>
          <Field label="6-digit OTP code">
            <Input name="code" inputMode="numeric" pattern="[0-9]{6}" required defaultValue={code} maxLength={6} />
          </Field>
          <Field label="New password">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input name="password" type="password" required minLength={8} className="pl-10" />
            </div>
          </Field>
          <Field label="Confirm password">
            <Input name="confirmPassword" type="password" required minLength={8} />
          </Field>
          {message ? <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{message}</p> : null}
          <Button disabled={loading}>{loading ? "Resetting..." : "Reset password"}</Button>
        </form>
      </CardBody>
    </Card>
  );
}
