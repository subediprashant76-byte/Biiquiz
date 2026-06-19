import { PublicShell } from "@/components/layout/product-shell";
import { JoinForm } from "@/components/participant/join-form";

export default function JoinPage() {
  return (
    <PublicShell>
      <main className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-lg font-black text-white shadow-card">bQ</div>
            <h1 className="mt-4 text-4xl font-black text-ink">Join Quiz</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter the room code from your host. No login required.</p>
          </div>
          <JoinForm />
          <p className="mt-5 text-center text-xs font-semibold text-slate-500">Need help? Ask your host for the six-character room code.</p>
        </div>
      </main>
    </PublicShell>
  );
}
