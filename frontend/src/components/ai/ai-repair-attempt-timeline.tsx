"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { AiRepairAttempt } from "@/services/ai-repair-loop.service";

export function AIRepairAttemptTimeline({
  attempts,
  working
}: {
  attempts: AiRepairAttempt[];
  working: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!attempts.length && !working) return null;
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-ink">AI progress</h3>
          {attempts.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDetailsOpen((current) => !current)}>
              {detailsOpen ? "Hide details" : "View details"}
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3">
          {attempts.map((attempt, index) => (
            <div key={`${attempt.step}-${index}`} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
              {attempt.status === "success" ? <CheckCircle2 className="text-success-500" size={18} /> : <XCircle className="text-red-500" size={18} />}
              <div>
                <p className="font-black text-ink">{friendlyStep(attempt)}</p>
                <p className="font-semibold text-slate-600">{friendlyMessage(attempt)}</p>
                {detailsOpen && (attempt.keyLabel || attempt.model || attempt.errorCount !== undefined) ? (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {[attempt.keyLabel, attempt.model, attempt.errorCount !== undefined ? `${attempt.errorCount} errors` : ""].filter(Boolean).join(" | ")}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {working ? (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm font-black text-brand-700">
              <Loader2 className="animate-spin" size={16} />
              Working through generation, validation, and repair...
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function friendlyStep(attempt: AiRepairAttempt) {
  if (attempt.step === "generate") return "Generating questions";
  if (attempt.step === "repair") return "Fixing issues";
  return "Validating questions";
}

function friendlyMessage(attempt: AiRepairAttempt) {
  if (attempt.step === "generate" && attempt.status === "success") return "Questions were created and are being checked.";
  if (attempt.step === "repair" && attempt.status === "success") return "Issues were fixed automatically.";
  if (attempt.step === "validate" && attempt.status === "success") return "Generated questions are ready.";
  if (attempt.step === "validate") return "Some questions need review.";
  return attempt.message;
}
