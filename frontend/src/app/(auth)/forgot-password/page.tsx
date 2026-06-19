import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PublicShell } from "@/components/layout/product-shell";

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <main className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-card">
              <KeyRound />
            </div>
            <h1 className="mt-4 text-3xl font-black text-ink">Forgot password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">We will send a 6-digit OTP code and reset link to your email.</p>
          </div>
          <ForgotPasswordForm />
          <p className="mt-5 text-center text-sm text-slate-600">
            Remembered it? <Link className="font-bold text-brand-600" href="/login">Login</Link>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
