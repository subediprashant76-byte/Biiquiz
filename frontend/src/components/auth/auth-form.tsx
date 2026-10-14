"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Github, KeyRound, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

type AuthResponse = {
  ok: boolean;
  data?: {
    role?: "admin" | "host";
    organizationId?: string | null;
  };
  error?: { message: string };
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    const payload = Object.fromEntries(formData);
    if (mode === "register" && payload.password !== payload.confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match.");
      return;
    }
    delete payload.confirmPassword;
    let response: Response;
    try {
      response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      setLoading(false);
      setMessage("Could not reach the login service. Please try again.");
      return;
    }

    let body: AuthResponse | undefined;
    try {
      body = (await response.json()) as AuthResponse;
    } catch {
      // Show a form error instead of crashing if a proxy returns an HTML 404/500 page.
    }
    setLoading(false);
    if (!response.ok || !body?.ok) {
      setMessage(body?.error?.message ?? "The login service returned an invalid response. Please try again.");
      return;
    }
    if (mode === "login" && body.data?.role === "admin" && !body.data.organizationId) {
      router.push("/super-admin/dashboard");
      return;
    }
    if (mode === "login" && body.data?.role === "admin") {
      router.push("/admin");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <Card className="mx-auto max-w-md border-slate-200 shadow-lifted">
      <CardBody>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary"><Mail size={16} />Google</Button>
          <Button type="button" variant="secondary"><Github size={16} />GitHub</Button>
        </div>
        <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> or continue with email <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action={submit} className="grid gap-4">
          {mode === "register" ? (
            <Field label="Name">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input name="name" required minLength={2} placeholder="Your name" className="pl-10" />
              </div>
            </Field>
          ) : null}
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input name="email" required type="email" placeholder="teacher@example.com" className="pl-10" />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input name="password" required type="password" minLength={mode === "register" ? 8 : 1} className="pl-10" />
            </div>
          </Field>
          {mode === "login" ? (
            <Link href="/forgot-password" className="-mt-2 text-right text-sm font-bold text-brand-600">Forgot password?</Link>
          ) : (
            <p className="-mt-2 text-xs font-semibold text-slate-500">Use 8+ characters with at least 3 of uppercase, lowercase, number, and symbol.</p>
          )}
          {mode === "register" ? (
            <Field label="Confirm password">
              <Input name="confirmPassword" required type="password" minLength={8} />
            </Field>
          ) : null}
          {message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
          <Button disabled={loading} size="lg">{loading ? "Please wait..." : mode === "register" ? "Create account" : "Login"}</Button>
        </form>
      </CardBody>
    </Card>
  );
}
