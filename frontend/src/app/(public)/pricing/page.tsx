import { CheckCircle2 } from "lucide-react";
import { PublicShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { plans } from "@/lib/ui-data";

export default function PricingPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wide text-brand-600">Pricing</p>
          <h1 className="mt-2 text-4xl font-black text-ink md:text-5xl">Start free, scale when the room gets bigger.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">Every host can run practical 50-participant sessions. Host Pass unlocks larger cohorts, branding, priority support, and institution workflows.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.featured ? "relative border-brand-300 shadow-lifted ring-2 ring-brand-100" : ""}>
              {plan.featured ? <span className="absolute right-4 top-4 rounded-full bg-brand-600 px-3 py-1 text-xs font-black text-white">Popular</span> : null}
              <CardBody>
                <h2 className="text-lg font-black text-ink">{plan.name}</h2>
                <p className="mt-5 text-4xl font-black text-brand-600">{plan.price}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">{plan.limit}</p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{plan.detail}</p>
                <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-600">
                  {["Live hosting", "CSV exports", "BYOK AI generation"].map((item) => (
                    <span key={item} className="flex items-center gap-2"><CheckCircle2 size={15} className="text-success-500" />{item}</span>
                  ))}
                </div>
                <LinkButton href="/register" variant={plan.featured ? "primary" : "secondary"} className="mt-6 w-full">Start</LinkButton>
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-ink p-8 text-white">
          <h2 className="text-2xl font-black">Need a school-wide rollout?</h2>
          <p className="mt-2 max-w-2xl text-slate-300">Use organization settings, host passes, analytics, and invite flows to manage departments from one workspace.</p>
          <LinkButton href="/register" className="mt-5 bg-white text-ink hover:bg-slate-100">Create organization workspace</LinkButton>
        </div>
      </div>
    </PublicShell>
  );
}
