import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PublicShell } from "@/components/layout/product-shell";
import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <PublicShell>
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="rounded-2xl bg-ink p-8 text-white shadow-lifted">
          <p className="text-sm font-black uppercase tracking-wide text-brand-200">Start hosting today</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">A professional live quiz workspace for educators.</h1>
          <p className="mt-4 leading-7 text-slate-300">Create rooms, use BYOK Gemini AI, and scale from classroom practice to organization programs.</p>
          <div className="mt-8 grid gap-3 text-sm font-bold text-slate-200">
            {["50 free participants", "No Gemini keys stored on backend", "Admin-ready PostgreSQL schema"].map((item) => (
              <span key={item} className="flex items-center gap-2"><CheckCircle2 className="text-success-500" size={17} />{item}</span>
            ))}
          </div>
          <div className="mt-8 rounded-xl bg-white/10 p-4">
            <p className="text-sm leading-6 text-slate-200">“biiQuiz feels like a practical classroom tool, not a toy. Our teachers can host sessions and review gaps without extra ceremony.”</p>
            <p className="mt-3 text-sm font-black">Demo School</p>
          </div>
        </section>
        <section>
          <div className="mb-5">
            <h2 className="text-3xl font-black text-ink">Create your host account</h2>
            <p className="mt-2 text-sm text-slate-600">New accounts are created as host users by default.</p>
          </div>
          <AuthForm mode="register" />
          <p className="mt-5 text-center text-sm text-slate-600">
            Already registered? <Link className="font-bold text-brand-600" href="/login">Login</Link>
          </p>
        </section>
      </main>
    </PublicShell>
  );
}
