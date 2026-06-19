"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, LogOut, Mail, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

type ProfileUser = {
  name: string;
  email: string;
  role: string;
};

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveProfile(formData: FormData) {
    setLoading(true);
    setProfileMessage("");
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData))
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setLoading(false);
    setProfileMessage(body.ok ? "Profile updated." : body.error?.message ?? "Could not update profile.");
    if (body.ok) router.refresh();
  }

  async function changePassword(formData: FormData) {
    setLoading(true);
    setPasswordMessage("");
    const payload = Object.fromEntries(formData);
    if (payload.newPassword !== payload.confirmPassword) {
      setLoading(false);
      setPasswordMessage("Passwords do not match.");
      return;
    }
    delete payload.confirmPassword;
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setLoading(false);
    setPasswordMessage(body.ok ? "Password changed." : body.error?.message ?? "Could not change password.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card>
        <CardBody>
          <h2 className="text-xl font-black text-ink">Profile details</h2>
          <p className="mt-1 text-sm text-slate-600">Used across host, organization admin, and enterprise admin workspaces.</p>
          <form action={saveProfile} className="mt-5 grid gap-4">
            <Field label="Name">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input name="name" defaultValue={user.name} required minLength={2} className="pl-10" />
              </div>
            </Field>
            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input name="email" type="email" defaultValue={user.email} required className="pl-10" />
              </div>
            </Field>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">Role: {user.role}</p>
            {profileMessage ? <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{profileMessage}</p> : null}
            <Button disabled={loading} className="w-fit"><Save size={16} />Save profile</Button>
          </form>
        </CardBody>
      </Card>

      <div className="grid content-start gap-6">
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">Change password</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Use at least 8 characters with a mix of letters, numbers, or symbols.</p>
            <form action={changePassword} className="mt-5 grid gap-4">
              <Field label="Current password">
                <Input name="currentPassword" type="password" required />
              </Field>
              <Field label="New password">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input name="newPassword" type="password" required minLength={8} className="pl-10" />
                </div>
              </Field>
              <Field label="Confirm new password">
                <Input name="confirmPassword" type="password" required minLength={8} />
              </Field>
              {passwordMessage ? <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{passwordMessage}</p> : null}
              <Button disabled={loading} variant="secondary"><KeyRound size={16} />Change password</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">Sign out</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">End this browser session and return to login.</p>
            <Button onClick={logout} variant="danger" className="mt-5"><LogOut size={16} />Logout</Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
