"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { GeminiKeyManager } from "@/components/ai/gemini-key-manager";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/product";
import { buildRepairPrompt, callGeminiWithFallback } from "@/services/gemini-client.service";

type Draft = {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  marks: number;
  timeLimit: number;
  status: string;
};

type Generation = {
  id: string;
  status: string;
  quizId: string;
  model?: string;
  rawJson?: unknown;
  fixedJson?: unknown;
  validationErrors?: unknown;
  attemptCount?: number;
  drafts: Draft[];
};

export function AiPreview({ generationId }: { generationId: string }) {
  const router = useRouter();
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [message, setMessage] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
  const [repairing, setRepairing] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/ai/generations/${generationId}`);
    const body = (await response.json()) as { ok: boolean; data?: Generation; error?: { message: string } };
    if (body.ok && body.data) setGeneration(body.data);
    else setMessage(body.error?.message ?? "Could not load AI preview.");
  }

  async function publish() {
    if (!generation || !["ready_for_preview", "repaired"].includes(generation.status)) {
      setMessage("Backend validation must pass before publishing.");
      return;
    }
    const response = await fetch("/api/ai/publish-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ generationId })
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    if (!body.ok) {
      setMessage(body.error?.message ?? "Could not publish.");
      return;
    }
    router.push(`/dashboard/quizzes/${generation?.quizId}/edit`);
  }

  async function repair() {
    if (!generation) return;
    const activeKeys = keys.filter(Boolean);
    if (activeKeys.length === 0) {
      setMessage("Add at least one Gemini API key to repair the saved JSON.");
      return;
    }
    setRepairing(true);
    setMessage("");
    try {
      const model = generation.model ?? process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-2.5-flash";
      const repairedJson = await callGeminiWithFallback(activeKeys, model, buildRepairPrompt(generation.fixedJson ?? generation.rawJson, generation.validationErrors));
      const response = await fetch("/api/ai/repair-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generationId, repairedJson })
      });
      const body = (await response.json()) as { ok: boolean; error?: { message: string } };
      if (!body.ok) throw new Error(body.error?.message ?? "Repair failed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Repair failed.");
    } finally {
      setRepairing(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="grid gap-4">
      <Card>
        <CardBody>
          <Tabs items={["Draft", "Preview", "Live"]} />
          <p className="mt-4 rounded-xl bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-700">
            Review every generated question before publishing. Invalid or duplicate questions should be removed or regenerated.
          </p>
          {generation?.validationErrors ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-black text-red-700">Backend validation failed</p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-red-700">{JSON.stringify(generation.validationErrors, null, 2)}</pre>
            </div>
          ) : null}
        </CardBody>
      </Card>
      {generation?.status === "validation_failed" ? (
        <Card>
          <CardBody>
            <h2 className="text-lg font-black text-ink">Repair saved JSON with your Gemini key</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Keys stay in this browser. Only the repaired JSON is sent to the backend for another validation pass.</p>
            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto]">
              <GeminiKeyManager onKeysChange={setKeys} />
              <Button onClick={repair} disabled={repairing} className="self-end"><RotateCcw size={16} />{repairing ? "Repairing..." : "Repair JSON"}</Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
      {message ? <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">{message}</p> : null}
      {generation?.drafts.map((draft) => (
        <Card key={draft.id} className={draft.status === "deleted" ? "border-red-200 bg-red-50/40" : ""}>
          <CardBody>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-black text-ink">{draft.questionText}</h2>
              <Badge tone={draft.status === "deleted" ? "red" : "green"}>{draft.status}</Badge>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {[
                ["A", draft.optionA],
                ["B", draft.optionB],
                ["C", draft.optionC],
                ["D", draft.optionD]
              ].map(([key, value]) => (
                <p key={key} className="rounded-xl border border-slate-200 bg-white p-3 font-semibold">
                  {key === draft.correctOption ? <CheckCircle2 className="mr-2 inline text-success-500" size={16} /> : null}
                  {key}. {value}
                </p>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-brand-700">
              Correct: {draft.correctOption} · {draft.marks} marks · {draft.timeLimit}s
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm"><Save size={15} />Keep</Button>
              <Button variant="secondary" size="sm"><RotateCcw size={15} />Regenerate</Button>
              <Button variant="ghost" size="sm"><Trash2 size={15} />Remove</Button>
            </div>
          </CardBody>
        </Card>
      ))}
      <div className="sticky bottom-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lifted">
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary"><Save size={16} />Save draft</Button>
          <Button variant="secondary"><Trash2 size={16} />Discard</Button>
          <Button onClick={publish} disabled={!generation || !["ready_for_preview", "repaired"].includes(generation.status) || generation.drafts.filter((draft) => draft.status !== "deleted").length === 0}><Send size={16} />Publish to quiz</Button>
        </div>
      </div>
    </div>
  );
}
