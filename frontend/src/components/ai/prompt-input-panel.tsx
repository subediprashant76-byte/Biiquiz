"use client";

import { FileText, Settings2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { AiPromptValues } from "@/services/ai-session-draft.service";

export function PromptInputPanel({
  initialValues,
  compact = false,
  namePrefix = "",
  simple = false
}: {
  initialValues?: Partial<AiPromptValues>;
  compact?: boolean;
  namePrefix?: "" | "ai";
  simple?: boolean;
}) {
  const fieldName = (name: keyof AiPromptValues) => (namePrefix ? `${namePrefix}${name[0].toUpperCase()}${name.slice(1)}` : name);
  const content = (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <FileText className="text-brand-600" />
        <h2 className="mt-2 text-xl font-black text-ink">{simple ? "Generate questions with AI" : "Describe the quiz topic"}</h2>
        {simple ? (
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Enter a topic and number of questions. We will generate and validate questions automatically.
          </p>
        ) : null}
      </div>
      <Field label="Number of questions">
        <Input name={fieldName("questionCount")} type="number" min={1} max={50} defaultValue={initialValues?.questionCount ?? 10} />
      </Field>
      <Field label="Difficulty">
        <Select name={fieldName("difficulty")} defaultValue={initialValues?.difficulty ?? "mixed"}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="mixed">Mixed</option>
        </Select>
      </Field>
      <Field label="Topic / prompt">
        <Textarea
          name={fieldName("topic")}
          required
          placeholder="Example: Grade 10 human nervous system with application-based MCQs."
          defaultValue={initialValues?.topic}
          className="min-h-32"
        />
      </Field>
      <Field label="Language">
        <Select name={fieldName("language")} defaultValue={initialValues?.language ?? "English"}>
          <option value="English">English</option>
          <option value="Nepali">Nepali</option>
          <option value="Hindi">Hindi</option>
          <option value="Spanish">Spanish</option>
          <option value="French">French</option>
        </Select>
      </Field>
      {simple ? (
        <>
          <input type="hidden" name={fieldName("subject")} value={initialValues?.subject ?? "General"} />
          <input type="hidden" name={fieldName("level")} value={initialValues?.level ?? "General"} />
          <input type="hidden" name={fieldName("marksPerQuestion")} value={initialValues?.marksPerQuestion ?? 1} />
          <input type="hidden" name={fieldName("timePerQuestion")} value={initialValues?.timePerQuestion ?? 30} />
          <input type="hidden" name={fieldName("extraInstruction")} value={initialValues?.extraInstruction ?? ""} />
        </>
      ) : (
        <>
          <div className="border-t border-slate-100 pt-4 md:col-span-2">
            <Settings2 className="text-brand-600" />
            <h2 className="mt-2 text-xl font-black text-ink">Question defaults</h2>
          </div>
          <Field label="Subject">
            <Input name={fieldName("subject")} placeholder="Biology" defaultValue={initialValues?.subject} />
          </Field>
          <Field label="Class/level">
            <Input name={fieldName("level")} placeholder="Grade 10" defaultValue={initialValues?.level} />
          </Field>
          <Field label="Marks per question">
            <Input name={fieldName("marksPerQuestion")} type="number" min={1} max={100} defaultValue={initialValues?.marksPerQuestion ?? 1} />
          </Field>
          <Field label="Time per question">
            <Input name={fieldName("timePerQuestion")} type="number" min={5} max={300} defaultValue={initialValues?.timePerQuestion ?? 30} />
          </Field>
          <Field label="Extra instruction">
            <Textarea name={fieldName("extraInstruction")} defaultValue={initialValues?.extraInstruction} />
          </Field>
        </>
      )}
    </div>
  );

  if (compact) {
    return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">{content}</div>;
  }

  return (
    <Card>
      <CardBody>
        {content}
      </CardBody>
    </Card>
  );
}
