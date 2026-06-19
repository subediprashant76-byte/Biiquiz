"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(formData: FormData) {
    setLoading(true);
    setMessage("");
    const requestedEmail = String(formData.get("email") ?? "").trim().toLowerCase();
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: requestedEmail })
    });
    await response.json();
    setLoading(false);
    setEmail(requestedEmail);
    setStep("reset");
    setMessage("If an account exists for this email, a reset code has been sent.");
  }

  async function resetPassword(formData: FormData) {
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

  async function resendCode() {
    if (!email) return;
    const formData = new FormData();
    formData.set("email", email);
    await requestCode(formData);
  }

  return (
    <Card className="mx-auto max-w-md shadow-lifted">
      <CardBody>
        {step === "request" ? (
          <form action={requestCode} className="grid gap-4">
            <Field label="Account email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input name="email" type="email" required placeholder="teacher@example.com" className="pl-10" />
              </div>
            </Field>
            {message ? <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{message}</p> : null}
            <Button disabled={loading}>{loading ? "Sending..." : "Send reset code"}</Button>
            <Link href="/reset-password" className="text-center text-sm font-bold text-brand-600">I already have a code</Link>
          </form>
        ) : (
          <form action={resetPassword} className="grid gap-4">
            <div className="rounded-xl bg-brand-50 px-4 py-3">
              <p className="text-sm font-black text-brand-700">Enter your 6-digit code</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">We sent it to {email}. The code expires automatically.</p>
            </div>
            <input type="hidden" name="email" value={email} />
            <Field label="6-digit OTP code">
              <Input name="code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} placeholder="024120" className="text-center text-xl font-black tracking-[0.35em]" />
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
            <div className="flex flex-wrap justify-center gap-4 text-sm font-bold">
              <button type="button" onClick={resendCode} disabled={loading} className="text-brand-600 disabled:opacity-50">Resend code</button>
              <button type="button" onClick={() => { setStep("request"); setMessage(""); }} className="text-slate-600">Use different email</button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
