"use client";

import { useState } from "react";
import { Bot, CheckCircle2, GripVertical, Plus, RadioTower } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export function QuestionEditor({ quizId }: { quizId: string }) {
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage("");
    const payload = {
      questionText: formData.get("questionText"),
      optionA: formData.get("optionA"),
      optionB: formData.get("optionB"),
      optionC: formData.get("optionC"),
      optionD: formData.get("optionD"),
      correctOption: formData.get("correctOption"),
      marks: Number(formData.get("marks")),
      timeLimit: Number(formData.get("timeLimit")),
      explanation: formData.get("explanation"),
      orderNumber: Number(formData.get("orderNumber"))
    };
    const response = await fetch(`/api/quizzes/${quizId}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setMessage(body.ok ? "Question added." : body.error?.message ?? "Could not add question.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <Card className="shadow-lifted">
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-brand-600">Question 1</p>
                <h2 className="mt-1 text-xl font-black text-ink">Manual question card</h2>
              </div>
              <GripVertical className="text-slate-300" />
            </div>
            <form action={submit} className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Question text">
                <Textarea name="questionText" required placeholder="Write a clear multiple-choice question." />
              </Field>
              <div className="grid gap-4">
                <Field label="Option A"><Input name="optionA" required /></Field>
                <Field label="Option B"><Input name="optionB" required /></Field>
                <Field label="Option C"><Input name="optionC" required /></Field>
                <Field label="Option D"><Input name="optionD" required /></Field>
              </div>
              <Field label="Correct option">
                <Select name="correctOption" defaultValue="A">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </Select>
              </Field>
              <Field label="Marks"><Input name="marks" type="number" min={1} max={100} defaultValue={1} /></Field>
              <Field label="Time limit"><Input name="timeLimit" type="number" min={5} max={300} defaultValue={30} /></Field>
              <Field label="Order"><Input name="orderNumber" type="number" min={1} defaultValue={1} /></Field>
              <Field label="Explanation"><Textarea name="explanation" /></Field>
              {message ? <p className="md:col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{message}</p> : null}
              <div className="flex flex-wrap gap-3 md:col-span-2"><Button><Plus size={16} />Add question</Button><Button type="button" variant="secondary">Preview</Button></div>
            </form>
          </CardBody>
        </Card>
        <button className="rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-8 text-center text-sm font-black text-brand-700">
          <Plus className="mx-auto mb-2" />
          Add another question
        </button>
      </div>
      <div className="grid content-start gap-4">
        <Card>
          <CardBody>
            <h3 className="font-black text-ink">Readiness</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              {["No negative marking", "Four options per question", "Timer and marks set"].map((item) => (
                <span key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success-500" />{item}</span>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Bot className="text-brand-600" />
            <h3 className="mt-3 font-black text-ink">Need faster drafts?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Generate structured MCQs with your own Gemini key, then review before publishing.</p>
            <LinkButton href={`/dashboard/quizzes/${quizId}/ai-generate`} className="mt-4 w-full">Open AI generator</LinkButton>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <RadioTower className="text-success-500" />
            <h3 className="mt-3 font-black text-ink">Ready to host?</h3>
            <LinkButton href={`/dashboard/quizzes/${quizId}/host`} variant="secondary" className="mt-4 w-full">Create live room</LinkButton>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
