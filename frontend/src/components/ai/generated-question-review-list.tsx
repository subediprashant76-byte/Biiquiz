"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { BackendQuestionPayload } from "@/services/question-schema-validator";

export function GeneratedQuestionReviewList({
  questions,
  backendErrors,
  onQuestionsChange
}: {
  questions: BackendQuestionPayload[];
  backendErrors: Record<number, string>;
  onQuestionsChange?: (questions: BackendQuestionPayload[]) => void;
}) {
  if (!questions.length) return null;

  function update(index: number, patch: Partial<BackendQuestionPayload>) {
    if (!onQuestionsChange) return;
    onQuestionsChange(questions.map((question, itemIndex) => (itemIndex === index ? { ...question, ...patch } : question)));
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 font-black text-ink">
          <CheckCircle2 size={18} className="text-success-500" />
          Generated question review
        </div>
        <div className="mt-4 grid gap-3">
          {questions.map((question, index) => (
            <article key={`${question.orderNumber}-${index}`} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-black text-ink">Question {index + 1}</h3>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">{question.marks} mark</span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{question.questionText}</p>
              {onQuestionsChange ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Question text">
                    <Textarea value={question.questionText} onChange={(event) => update(index, { questionText: event.target.value })} />
                  </Field>
                  <div className="grid gap-3">
                    {(["A", "B", "C", "D"] as const).map((key) => (
                      <Field key={key} label={`Option ${key}`}>
                        <Input value={question[`option${key}`]} onChange={(event) => update(index, { [`option${key}`]: event.target.value })} />
                      </Field>
                    ))}
                  </div>
                  <Field label="Correct answer">
                    <Select value={question.correctOption} onChange={(event) => update(index, { correctOption: event.target.value as BackendQuestionPayload["correctOption"] })}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </Select>
                  </Field>
                  <Field label="Marks">
                    <Input type="number" min={1} max={100} value={question.marks} onChange={(event) => update(index, { marks: Number(event.target.value) })} />
                  </Field>
                  <Field label="Time limit">
                    <Input type="number" min={5} max={300} value={question.timeLimit} onChange={(event) => update(index, { timeLimit: Number(event.target.value) })} />
                  </Field>
                  <Field label="Explanation">
                    <Textarea value={question.explanation ?? ""} onChange={(event) => update(index, { explanation: event.target.value })} />
                  </Field>
                </div>
              ) : (
                <>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    {(["A", "B", "C", "D"] as const).map((key) => (
                      <span key={key} className="rounded-lg bg-slate-50 px-3 py-2 font-semibold">
                        {key}. {question[`option${key}`]}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-black text-success-700">Correct answer: {question.correctOption}</p>
                  {question.explanation ? <p className="mt-2 text-xs font-semibold text-slate-500">{question.explanation}</p> : null}
                </>
              )}
              {backendErrors[index] ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{backendErrors[index]}</p> : null}
            </article>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
