"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, CheckCircle2, GripVertical, Plus, RadioTower, Save, Trash2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

type SavedQuestion = {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  marks: number;
  timeLimit: number;
  explanation?: string | null;
  orderNumber: number;
};

export function QuestionEditor({ quizId }: { quizId: string }) {
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<SavedQuestion[]>([]);
  const [editing, setEditing] = useState<Record<string, SavedQuestion>>({});
  const nextOrder = Math.max(0, ...questions.map((question) => question.orderNumber)) + 1;

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/quizzes/${quizId}`, { cache: "no-store" });
    const body = (await response.json()) as { ok: boolean; data?: { questions?: SavedQuestion[] }; error?: { message: string } };
    if (body.ok && body.data?.questions) setQuestions(body.data.questions);
    else setMessage(body.error?.message ?? "Could not load saved questions.");
  }, [quizId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    if (body.ok) await refresh();
  }

  async function saveQuestion(questionId: string) {
    const question = editing[questionId];
    if (!question) return;
    const response = await fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        questionText: question.questionText,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctOption: question.correctOption,
        marks: question.marks,
        timeLimit: question.timeLimit,
        explanation: question.explanation,
        orderNumber: question.orderNumber
      })
    });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setMessage(body.ok ? "Question updated." : body.error?.message ?? "Could not update question.");
    if (body.ok) {
      setEditing(({ [questionId]: _removed, ...rest }) => rest);
      await refresh();
    }
  }

  async function deleteQuestion(questionId: string) {
    const response = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
    const body = (await response.json()) as { ok: boolean; error?: { message: string } };
    setMessage(body.ok ? "Question deleted." : body.error?.message ?? "Could not delete question.");
    if (body.ok) await refresh();
  }

  function updateDraft(questionId: string, patch: Partial<SavedQuestion>) {
    setEditing((current) => {
      const base = current[questionId] ?? questions.find((question) => question.id === questionId);
      return base ? { ...current, [questionId]: { ...base, ...patch } } : current;
    });
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
              <Field label="Order"><Input key={nextOrder} name="orderNumber" type="number" min={1} defaultValue={nextOrder} /></Field>
              <Field label="Explanation"><Textarea name="explanation" /></Field>
              {message ? <p className="md:col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{message}</p> : null}
              <div className="flex flex-wrap gap-3 md:col-span-2"><Button><Plus size={16} />Add question</Button><Button type="button" variant="secondary">Preview</Button></div>
            </form>
          </CardBody>
        </Card>
        <button className="rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-8 text-center text-sm font-black text-brand-700">
          <Plus className="mx-auto mb-2" />Saved draft questions: {questions.length}
        </button>
        <Card>
          <CardBody>
            <h2 className="text-lg font-black text-ink">Preview and edit questions</h2>
            <p className="mt-1 text-sm text-slate-600">Generated and manual questions are saved as draft until you create a live room.</p>
            <div className="mt-4 grid gap-3">
              {questions.map((question) => {
                const draft = editing[question.id] ?? question;
                return (
                  <article key={question.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-black uppercase text-brand-600">Question {question.orderNumber}</p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => saveQuestion(question.id)} disabled={!editing[question.id]}>
                          <Save size={14} />Save
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => deleteQuestion(question.id)}>
                          <Trash2 size={14} />Delete
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Question text">
                        <Textarea value={draft.questionText} onChange={(event) => updateDraft(question.id, { questionText: event.target.value })} />
                      </Field>
                      <div className="grid gap-3">
                        <Field label="Option A"><Input value={draft.optionA} onChange={(event) => updateDraft(question.id, { optionA: event.target.value })} /></Field>
                        <Field label="Option B"><Input value={draft.optionB} onChange={(event) => updateDraft(question.id, { optionB: event.target.value })} /></Field>
                        <Field label="Option C"><Input value={draft.optionC} onChange={(event) => updateDraft(question.id, { optionC: event.target.value })} /></Field>
                        <Field label="Option D"><Input value={draft.optionD} onChange={(event) => updateDraft(question.id, { optionD: event.target.value })} /></Field>
                      </div>
                      <Field label="Correct option">
                        <Select value={draft.correctOption} onChange={(event) => updateDraft(question.id, { correctOption: event.target.value as SavedQuestion["correctOption"] })}>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </Select>
                      </Field>
                      <Field label="Marks"><Input type="number" min={1} max={100} value={draft.marks} onChange={(event) => updateDraft(question.id, { marks: Number(event.target.value) })} /></Field>
                      <Field label="Time limit"><Input type="number" min={5} max={300} value={draft.timeLimit} onChange={(event) => updateDraft(question.id, { timeLimit: Number(event.target.value) })} /></Field>
                      <Field label="Explanation"><Textarea value={draft.explanation ?? ""} onChange={(event) => updateDraft(question.id, { explanation: event.target.value })} /></Field>
                    </div>
                  </article>
                );
              })}
              {questions.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">No questions saved yet. Generate with AI or add a manual question.</p> : null}
            </div>
          </CardBody>
        </Card>
      </div>
      <div className="grid content-start gap-4">
        <Card>
          <CardBody>
            <h3 className="font-black text-ink">Readiness</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              {[`${questions.length} saved question${questions.length === 1 ? "" : "s"}`, "Four options per question", "Timer and marks set"].map((item) => (
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
            {questions.length > 0 ? (
              <LinkButton href={`/dashboard/quizzes/${quizId}/host`} variant="secondary" className="mt-4 w-full">Go live</LinkButton>
            ) : (
              <Button type="button" disabled variant="secondary" className="mt-4 w-full">Add questions before going live</Button>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
