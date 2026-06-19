import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/layout/product-shell";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <PublicShell>
      <main className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-card">
              <ShieldCheck />
            </div>
            <h1 className="mt-4 text-3xl font-black text-ink">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Secure access for hosts and admins.</p>
          </div>
          <AuthForm mode="login" />
          <p className="mt-5 text-center text-sm text-slate-600">
            New host? <Link className="font-bold text-brand-600" href="/register">Create an account</Link>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
