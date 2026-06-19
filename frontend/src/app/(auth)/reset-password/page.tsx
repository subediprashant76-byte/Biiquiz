import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PublicShell } from "@/components/layout/product-shell";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string; code?: string }> }) {
  const params = await searchParams;
  return (
    <PublicShell>
      <main className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-card">
              <ShieldCheck />
            </div>
            <h1 className="mt-4 text-3xl font-black text-ink">Reset password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter the OTP code from your email. Codes expire automatically.</p>
          </div>
          <ResetPasswordForm email={params.email ?? ""} code={params.code ?? ""} />
          <p className="mt-5 text-center text-sm text-slate-600">
            Need a new code? <Link className="font-bold text-brand-600" href="/forgot-password">Send again</Link>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
