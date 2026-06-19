"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Settings2, Sparkles } from "lucide-react";
import { GeminiKeyManager } from "@/components/ai/gemini-key-manager";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { callGeminiWithFallback } from "@/services/gemini-client.service";

export function AiGeneratorForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [keys, setKeys] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const model = useMemo(() => process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-2.5-flash", []);

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    const activeKeys = keys.filter(Boolean);
    if (activeKeys.length === 0) {
      setMessage("Add at least one Gemini API key.");
      setLoading(false);
      return;
    }

    const input = {
      quizId,
      subject: String(formData.get("subject") ?? ""),
      level: String(formData.get("level") ?? ""),
      topic: String(formData.get("topic") ?? ""),
      difficulty: String(formData.get("difficulty") ?? "mixed"),
      language: String(formData.get("language") ?? "English"),
      questionCount: Number(formData.get("questionCount") ?? 10),
      marksPerQuestion: Number(formData.get("marksPerQuestion") ?? 1),
      timePerQuestion: Number(formData.get("timePerQuestion") ?? 30),
      extraInstruction: String(formData.get("extraInstruction") ?? ""),
      model
    };

    try {
      const generatedJson = await callGeminiWithFallback(activeKeys, model, buildPrompt(input));
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input, generatedJson })
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { generation: { id: string } };
        error?: { message: string };
      };
      if (!body.ok || !body.data) throw new Error(body.error?.message ?? "Could not save generated questions.");
      router.push(`/dashboard/quizzes/${quizId}/ai-preview/${body.data.generation.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid content-start gap-4">
        <div className="rounded-xl border border-warning-500/20 bg-warning-50 p-4 text-sm font-semibold leading-6 text-warning-700">
          <AlertTriangle className="mb-2" size={18} />
          Gemini keys stay in this browser. The backend receives generated JSON only for validation and saving.
        </div>
        <GeminiKeyManager onKeysChange={setKeys} />
      </div>
      <Card>
        <CardBody>
          <form action={submit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FileText className="text-brand-600" />
              <h2 className="mt-2 text-xl font-black text-ink">2. Describe the quiz topic</h2>
            </div>
            <Field label="Subject">
              <Input name="subject" required placeholder="Biology" />
            </Field>
            <Field label="Class/level">
              <Input name="level" required placeholder="Grade 10" />
            </Field>
            <Field label="Topic">
              <Input name="topic" required placeholder="Human nervous system" />
            </Field>
            <Field label="Difficulty">
              <Select name="difficulty" defaultValue="mixed">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
            <Field label="Language">
              <Input name="language" defaultValue="English" />
            </Field>
            <div className="md:col-span-2 border-t border-slate-100 pt-4">
              <Settings2 className="text-brand-600" />
              <h2 className="mt-2 text-xl font-black text-ink">3. Set question rules</h2>
            </div>
            <Field label="Questions">
              <Input name="questionCount" type="number" min={1} max={50} defaultValue={10} />
            </Field>
            <Field label="Marks per question">
              <Input name="marksPerQuestion" type="number" min={1} max={100} defaultValue={1} />
            </Field>
            <Field label="Time per question">
              <Input name="timePerQuestion" type="number" min={5} max={300} defaultValue={30} />
            </Field>
            <Field label="Extra instruction">
              <Textarea name="extraInstruction" placeholder="Focus on entrance exam style questions." />
            </Field>
            {message ? <p className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
            <div className="md:col-span-2">
              <Button disabled={loading} size="lg">
                <Sparkles size={16} />
                {loading ? "Generating..." : "Generate with my Gemini key"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function buildPrompt(input: Record<string, string | number>) {
  return `Generate quiz questions as valid JSON only.
Do not return markdown or code fences.
Rules:
- Multiple-choice questions only.
- Exactly 4 options.
- correctOption must be A, B, C, or D.
- No negative marking fields.
- Wrong answer, timeout, and no answer get 0.

Host input:
Subject: ${input.subject}
Level: ${input.level}
Topic: ${input.topic}
Difficulty: ${input.difficulty}
Language: ${input.language}
Question count: ${input.questionCount}
Marks per question: ${input.marksPerQuestion}
Time per question: ${input.timePerQuestion}
Extra instruction: ${input.extraInstruction}

Return this exact JSON shape:
{"quizTitle":"string","subject":"string","level":"string","questions":[{"questionText":"string","optionA":"string","optionB":"string","optionC":"string","optionD":"string","correctOption":"A","marks":1,"timeLimit":30,"explanation":"string"}]}`;
}
