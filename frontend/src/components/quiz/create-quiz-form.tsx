"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export function CreateQuizForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    const payload = {
      title: formData.get("title"),
      subject: formData.get("subject"),
      description: formData.get("description"),
      defaultTimeLimit: Number(formData.get("defaultTimeLimit")),
      defaultMarks: Number(formData.get("defaultMarks")),
      visibility: formData.get("visibility")
    };
    const response = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as { ok: boolean; data?: { id: string }; error?: { message: string } };
    setLoading(false);
    if (!body.ok || !body.data) {
      setMessage(body.error?.message ?? "Could not create quiz.");
      return;
    }
    router.push(`/dashboard/quizzes/${body.data.id}/edit`);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="shadow-lifted">
        <CardBody>
          <form action={submit} className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="text-xl font-black text-ink">General information</h2>
              <p className="mt-1 text-sm text-slate-600">Define the quiz basics. You can add manual or AI-generated questions next.</p>
            </div>
            <Field label="Quiz title">
              <Input name="title" required minLength={3} placeholder="Physics Entrance Practice" />
            </Field>
            <Field label="Subject">
              <Input name="subject" placeholder="Science" />
            </Field>
            <Field label="Visibility">
              <Select name="visibility" defaultValue="private">
                <option value="private">Private</option>
                <option value="organization">Organization</option>
                <option value="public">Public</option>
              </Select>
            </Field>
            <Field label="Description">
              <Textarea name="description" placeholder="Short description for hosts and students" />
            </Field>
            <div className="md:col-span-2 border-t border-slate-100 pt-4">
              <h3 className="text-lg font-black text-ink">Default question settings</h3>
            </div>
            <Field label="Default timer">
              <Input name="defaultTimeLimit" type="number" min={5} max={300} defaultValue={30} />
            </Field>
            <Field label="Default marks">
              <Input name="defaultMarks" type="number" min={1} max={100} defaultValue={1} />
            </Field>
            {message ? <p className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button disabled={loading}>{loading ? "Creating..." : "Create quiz"}</Button>
              <Button type="button" variant="secondary">Save draft</Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <div className="grid gap-4">
        <Card>
          <CardBody>
            <Lightbulb className="text-warning-500" />
            <h3 className="mt-3 text-lg font-black text-ink">Pro tip</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Start with defaults that work for most questions. You can override timer and marks on each question in the editor.</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-black text-ink">Readiness checklist</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              {["Quiz metadata saved", "At least one question", "Room settings configured"].map((item) => (
                <span key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success-500" />{item}</span>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
