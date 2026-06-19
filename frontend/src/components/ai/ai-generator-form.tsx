"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AIRepairAttemptTimeline } from "@/components/ai/ai-repair-attempt-timeline";
import { GeminiSettingsPanel, readSavedGeminiSettings, type GeminiSettingsState } from "@/components/ai/gemini-settings-panel";
import { GeneratedJSONPreview } from "@/components/ai/generated-json-preview";
import { GeneratedQuestionReviewList } from "@/components/ai/generated-question-review-list";
import { PromptInputPanel } from "@/components/ai/prompt-input-panel";
import { ApplyQuestionsToQuizButton, ClearAIDraftButton, GenerateQuestionsButton } from "@/components/ai/quick-ai-gen-card";
import { ValidationErrorPanel } from "@/components/ai/validation-error-panel";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { questionSchema } from "@/schemas/question.schema";
import { clearAiSessionDraft, readAiSessionDraft, type AiPromptValues } from "@/services/ai-session-draft.service";
import { runAiQuestionRepairLoop, type AiRepairAttempt } from "@/services/ai-repair-loop.service";
import type { BackendQuestionPayload, QuestionValidationError } from "@/services/question-schema-validator";

type QuizResponse = {
  ok: boolean;
  data?: {
    questions?: Array<{ orderNumber: number }>;
  };
  error?: { message: string };
};

type SaveResponse = {
  ok: boolean;
  error?: { message: string };
};

const defaultSettings: GeminiSettingsState = {
  enabled: true,
  primaryApiKey: "",
  fallbackApiKeys: [],
  primaryModel: process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-2.5-flash",
  fallbackModels: [],
  repairAttempts: 3,
  maxOutputTokens: 16384,
  rememberKeys: false
};

export function AiGeneratorForm({ quizId }: { quizId: string }) {
  const [settings, setSettings] = useState<GeminiSettingsState>(defaultSettings);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "failed" | "saving" | "saved">("idle");
  const [attempts, setAttempts] = useState<AiRepairAttempt[]>([]);
  const [rawJson, setRawJson] = useState<unknown>(null);
  const [currentJson, setCurrentJson] = useState<unknown>(null);
  const [validationErrors, setValidationErrors] = useState<QuestionValidationError[]>([]);
  const [questions, setQuestions] = useState<BackendQuestionPayload[]>([]);
  const [backendErrors, setBackendErrors] = useState<Record<number, string>>({});
  const [nextOrder, setNextOrder] = useState(1);
  const [promptDefaults, setPromptDefaults] = useState<Partial<AiPromptValues>>({});
  const [promptKey, setPromptKey] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const loading = status === "generating";
  const saving = status === "saving";

  const refreshNextOrder = useCallback(async () => {
    const response = await fetch(`/api/quizzes/${quizId}`, { cache: "no-store" });
    const body = (await response.json()) as QuizResponse;
    const maxOrder = body.ok ? Math.max(0, ...(body.data?.questions ?? []).map((question) => question.orderNumber)) : 0;
    const order = maxOrder + 1;
    setNextOrder(order);
    return order;
  }, [quizId]);

  useEffect(() => {
    const savedSettings = readSavedGeminiSettings(defaultSettings);
    const sessionDraft = readAiSessionDraft();
    if (sessionDraft) {
      setSettings({ ...savedSettings, ...sessionDraft.settings, rememberKeys: Boolean(sessionDraft.settings.rememberKeys) });
      setPromptDefaults(sessionDraft.prompt);
      setPromptKey((key) => key + 1);
      setAutoStart(Boolean(sessionDraft.autoStart));
      clearAiSessionDraft();
      return;
    }
    setSettings(savedSettings);
  }, []);

  useEffect(() => {
    void refreshNextOrder();
  }, [refreshNextOrder]);

  useEffect(() => {
    if (!autoStart || !formRef.current) return;
    const timer = window.setTimeout(() => {
      formRef.current?.requestSubmit();
      setAutoStart(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoStart, promptKey]);

  const readyText = useMemo(() => {
    if (status === "ready") return "All generated questions are valid and ready to add to your quiz.";
    if (status === "saved") return "Saved successfully. You can continue reviewing the quiz editor.";
    return "";
  }, [status]);

  async function submit(formData: FormData) {
    setMessage("");
    setBackendErrors({});
    setAttempts([]);
    setValidationErrors([]);

    if (!settings.enabled) {
      setStatus("failed");
      setMessage("FEATURE_NOT_ENABLED: AI generation is disabled in your Gemini settings.");
      return;
    }

    setStatus("generating");
    try {
      const orderStart = await refreshNextOrder();
      const input = formInput(formData);
      const result = await runAiQuestionRepairLoop({
        prompt: buildPrompt(input),
        settings: {
          ...settings,
          maxOutputTokens: Math.max(settings.maxOutputTokens, Math.min(32768, input.questionCount * 900))
        },
        repairAttempts: settings.repairAttempts,
        startOrder: orderStart,
        targetCount: input.questionCount,
        onAttempt: (attempt) => setAttempts((items) => [...items, attempt])
      });

      setRawJson(result.rawJson);
      setCurrentJson(result.currentJson);
      setValidationErrors(result.validation.errors);
      setQuestions(result.questions);
      setStatus(result.status === "ready" ? "ready" : "failed");
      setMessage(result.status === "ready" ? "" : "MAX_REPAIR_ATTEMPTS_REACHED: Some questions still have validation errors. Please review and fix them manually.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "AI generation failed.");
    }
  }

  async function applyQuestions() {
    setMessage("");
    setBackendErrors({});
    if (!questions.length) {
      setMessage("NO_VALID_QUESTIONS: Generate valid questions before saving.");
      return;
    }

    const orderStart = await refreshNextOrder();
    const payloads = questions.map((question, index) => ({ ...question, orderNumber: orderStart + index }));
    const localErrors = validateEditedQuestions(payloads);
    if (Object.keys(localErrors).length) {
      setBackendErrors(localErrors);
      setMessage("QUESTION_SCHEMA_INVALID: Please fix the highlighted questions before saving.");
      return;
    }

    setStatus("saving");
    const failed: Record<number, string> = {};
    for (const [index, payload] of payloads.entries()) {
      const response = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = (await response.json()) as SaveResponse;
      if (!body.ok) failed[index] = body.error?.message ?? "The backend rejected this question.";
    }

    if (Object.keys(failed).length) {
      setBackendErrors(failed);
      setStatus("failed");
      setMessage("BACKEND_VALIDATION_FAILED: The backend rejected some questions. Please review the highlighted errors.");
      return;
    }

    setQuestions(payloads);
    setStatus("saved");
    setMessage("");
    await refreshNextOrder();
  }

  function clearDraft() {
    setAttempts([]);
    setRawJson(null);
    setCurrentJson(null);
    setValidationErrors([]);
    setQuestions([]);
    setBackendErrors({});
    setMessage("");
    setStatus("idle");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <form ref={formRef} action={submit} className="grid content-start gap-4">
        <div className="rounded-xl border border-warning-500/20 bg-warning-50 p-4 text-sm font-semibold leading-6 text-warning-700">
          <AlertTriangle className="mb-2" size={18} />
          Gemini keys stay in this browser. The backend receives only final accepted question payloads.
        </div>
        <GeminiSettingsPanel value={settings} onChange={setSettings} />
        <PromptInputPanel key={promptKey} initialValues={promptDefaults} simple />
        {message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
        {readyText ? (
          <p className="flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm font-semibold text-success-700">
            <CheckCircle2 size={16} />
            {readyText}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <GenerateQuestionsButton loading={loading || autoStart} />
          <Button type="button" variant="secondary" onClick={() => setValidationErrors(validateEditedQuestionsAsList(questions))} disabled={!questions.length}>
            Validate JSON
          </Button>
          <ClearAIDraftButton disabled={!rawJson && !questions.length} onClick={clearDraft} />
        </div>
      </form>

      <div className="grid content-start gap-4">
        <Card>
          <CardBody>
            <h2 className="text-xl font-black text-ink">Review and save</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              AI output is temporary until you apply it. Current saved questions start at order {nextOrder}.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ApplyQuestionsToQuizButton disabled={status !== "ready" || !questions.length} saving={saving} onClick={applyQuestions} />
              <LinkButton href={`/dashboard/quizzes/${quizId}/edit`} variant="secondary">Open editor</LinkButton>
            </div>
          </CardBody>
        </Card>
        <AIRepairAttemptTimeline attempts={attempts} working={loading} />
        <ValidationErrorPanel errors={validationErrors} />
        <GeneratedQuestionReviewList questions={questions} backendErrors={backendErrors} onQuestionsChange={setQuestions} />
        <GeneratedJSONPreview value={currentJson} />
      </div>
    </div>
  );
}

function formInput(formData: FormData) {
  return {
    subject: String(formData.get("subject") ?? ""),
    level: String(formData.get("level") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    difficulty: String(formData.get("difficulty") ?? "mixed"),
    language: String(formData.get("language") ?? "English"),
    questionCount: Number(formData.get("questionCount") ?? 10),
    marksPerQuestion: Number(formData.get("marksPerQuestion") ?? 1),
    timePerQuestion: Number(formData.get("timePerQuestion") ?? 30),
    extraInstruction: String(formData.get("extraInstruction") ?? "")
  };
}

function validateEditedQuestions(payloads: BackendQuestionPayload[]) {
  const errors: Record<number, string> = {};
  for (const [index, payload] of payloads.entries()) {
    const parsed = questionSchema.safeParse(payload);
    if (!parsed.success) errors[index] = parsed.error.issues[0]?.message ?? "Question is invalid.";
  }
  return errors;
}

function validateEditedQuestionsAsList(payloads: BackendQuestionPayload[]): QuestionValidationError[] {
  return Object.entries(validateEditedQuestions(payloads)).map(([index, message]) => ({
    questionIndex: Number(index),
    field: "question",
    message
  }));
}

function buildPrompt(input: ReturnType<typeof formInput>) {
  return `Generate quiz questions as valid JSON only.
Do not return markdown or code fences.
Rules:
- The backend supports only single_correct multiple-choice questions.
- Exactly 4 options with keys A, B, C, D.
- correctAnswer must be A, B, C, or D.
- negativeMarks must be 0.
- Do not include unsupported question types.
- Questions must be distinct, clear, and answerable.
- The questions array must contain exactly ${input.questionCount} questions.

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

Return this exact JSON shape with exactly ${input.questionCount} question objects:
{"quiz":{"title":"","subject":"","description":"","visibility":"private","defaultTimer":30,"defaultMarks":1},"questions":[{"questionText":"","questionType":"single_correct","difficulty":"easy","options":[{"key":"A","text":""},{"key":"B","text":""},{"key":"C","text":""},{"key":"D","text":""}],"correctAnswer":"A","explanation":"","marks":1,"negativeMarks":0,"timerSeconds":30,"tags":[]}]}`;
}
