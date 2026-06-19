import type { GeminiSettings } from "@/services/gemini-client.service";

export type AiPromptValues = {
  subject: string;
  level: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  language: string;
  questionCount: number;
  marksPerQuestion: number;
  timePerQuestion: number;
  extraInstruction: string;
};

export type AiSessionDraft = {
  settings: GeminiSettings & {
    enabled: boolean;
    repairAttempts: number;
    rememberKeys?: boolean;
  };
  prompt: AiPromptValues;
  autoStart?: boolean;
};

export const aiSessionDraftKey = "biiquiz_quick_ai_session_draft";

export function saveAiSessionDraft(draft: AiSessionDraft) {
  window.sessionStorage.setItem(aiSessionDraftKey, JSON.stringify(draft));
}

export function readAiSessionDraft() {
  const saved = window.sessionStorage.getItem(aiSessionDraftKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as AiSessionDraft;
  } catch {
    return null;
  }
}

export function clearAiSessionDraft() {
  window.sessionStorage.removeItem(aiSessionDraftKey);
}
