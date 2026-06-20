import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import { PublicShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { landingFeatures, plans } from "@/lib/ui-data";

export default function LandingPage() {
  return (
    <PublicShell>
      <section className="page-grid">
        <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-black uppercase tracking-wide text-brand-700">
              biiQuiz Live
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-tight text-ink md:text-7xl">
              Host Live Quizzes for Focused Rooms
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Create timed quiz rooms, generate questions with your own Gemini
              key, and track learning outcomes from a clean host dashboard built
              for schools and training teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">
                Host a Quiz <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/join" variant="secondary" size="lg">
                <PlayCircle size={18} />
                Join Quiz
              </LinkButton>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-3">
              {[
                "50 free participants",
                "No participant login",
                "PostgreSQL-backed results",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lifted">
            <div className="rounded-2xl bg-ink p-5 text-white">
              <div className="flex items-center justify-between">
                <p className="font-bold">Live Room</p>
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-200">
                  ACTIVE
                </span>
              </div>
              <p className="mt-6 text-6xl font-black">K8Q2P4</p>
              <p className="mt-2 text-sm text-slate-300">
                Grade 10 Physics Entrance Practice
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Stat value="43" label="Joined" />
                <Stat value="38" label="Answered" />
                <Stat value="21s" label="Timer" />
              </div>
              <div className="mt-6 rounded-xl bg-white p-4 text-ink">
                <p className="text-sm font-black text-slate-500">
                  Current question
                </p>
                <p className="mt-2 text-lg font-black">
                  Which law explains action and reaction forces?
                </p>
                <div className="mt-4 grid gap-2">
                  {[
                    "Newton's first law",
                    "Newton's third law",
                    "Law of inertia",
                  ].map((option, index) => (
                    <div
                      key={option}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {landingFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardBody>
                <feature.icon className="text-brand-600" />
                <h2 className="mt-4 text-lg font-black text-ink">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.text}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
          {plans.slice(0, 3).map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.featured ? "border-brand-200 ring-2 ring-brand-100" : ""
              }
            >
              <CardBody>
                <h3 className="text-lg font-black text-ink">{plan.name}</h3>
                <p className="mt-4 text-4xl font-black text-brand-600">
                  {plan.price}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {plan.limit}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {plan.detail}
                </p>
                <LinkButton
                  href="/pricing"
                  variant={plan.featured ? "primary" : "secondary"}
                  className="mt-5 w-full"
                >
                  View plan
                </LinkButton>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold text-slate-300">{label}</p>
    </div>
  );
}
