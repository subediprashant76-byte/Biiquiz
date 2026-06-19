import {
  buildQuestionRepairPrompt,
  callGeminiWithSettings,
  type GeminiCallResult,
  type GeminiSettings
} from "@/services/gemini-client.service";
import {
  validateAiQuestionJson,
  type BackendQuestionPayload,
  type QuestionValidationError,
  type QuestionValidationResult
} from "@/services/question-schema-validator";

export type AiRepairAttempt = {
  step: "generate" | "validate" | "repair";
  status: "success" | "failed";
  message: string;
  keyLabel?: string;
  model?: string;
  errorCount?: number;
};

export type AiRepairLoopResult = {
  status: "ready" | "failed";
  rawJson: unknown;
  currentJson: unknown;
  validation: QuestionValidationResult;
  attempts: AiRepairAttempt[];
  questions: BackendQuestionPayload[];
};

export async function runAiQuestionRepairLoop({
  prompt,
  settings,
  repairAttempts,
  startOrder,
  targetCount = 1,
  onAttempt
}: {
  prompt: string;
  settings: GeminiSettings;
  repairAttempts: number;
  startOrder: number;
  targetCount?: number;
  onAttempt?: (attempt: AiRepairAttempt) => void;
}): Promise<AiRepairLoopResult> {
  const attempts: AiRepairAttempt[] = [];
  const addAttempt = (attempt: AiRepairAttempt) => {
    attempts.push(attempt);
    onAttempt?.(attempt);
  };

  const requestedCount = Math.max(1, Math.min(50, Math.floor(targetCount)));
  const acceptedQuestions: BackendQuestionPayload[] = [];
  const rawBatches: unknown[] = [];
  const fixedBatches: unknown[] = [];
  let finalValidation: QuestionValidationResult = emptyValidation();
  const maxGenerationCalls = Math.max(3, requestedCount);

  for (let callIndex = 0; acceptedQuestions.length < requestedCount && callIndex < maxGenerationCalls; callIndex += 1) {
    const remaining = requestedCount - acceptedQuestions.length;
    const batchPrompt = buildBatchPrompt(prompt, requestedCount, remaining, acceptedQuestions);
    const generated = await callAndTrack(settings, batchPrompt, "generate", addAttempt);
    rawBatches.push(generated.json);
    let currentJson = generated.json;
    let validation = validationWithParseError(validateAiQuestionJson(currentJson, startOrder + acceptedQuestions.length), generated.parseError);
    addAttempt(validationAttempt(validation, acceptedQuestions.length, requestedCount));

    let repairCount = 0;
    while (!validation.valid && repairCount < repairAttempts) {
      repairCount += 1;
      const repairPrompt = buildQuestionRepairPrompt(currentJson, validation.errors);
      const repaired = await callAndTrack(settings, repairPrompt, "repair", addAttempt);
      currentJson = repaired.json;
      validation = validationWithParseError(validateAiQuestionJson(currentJson, startOrder + acceptedQuestions.length), repaired.parseError);
      addAttempt(validationAttempt(validation, acceptedQuestions.length, requestedCount));
    }

    fixedBatches.push(currentJson);
    finalValidation = validation;
    if (!validation.valid) {
      break;
    }

    const needed = requestedCount - acceptedQuestions.length;
    acceptedQuestions.push(...validation.normalizedQuestions.slice(0, needed));
    addAttempt({
      step: "validate",
      status: "success",
      message: `${acceptedQuestions.length} of ${requestedCount} requested questions are valid.`,
      errorCount: requestedCount - acceptedQuestions.length
    });
  }

  if (acceptedQuestions.length !== requestedCount) {
    const validation = {
      valid: false,
      cleanedJson: fixedBatches,
      normalizedQuestions: [],
      errors: [
        {
          field: "questions",
          message: `Requested ${requestedCount} questions, but Gemini produced ${acceptedQuestions.length} valid questions. Try a shorter topic or fewer questions.`
        },
        ...finalValidation.errors
      ]
    };
    return {
      status: "failed",
      rawJson: rawBatches,
      currentJson: fixedBatches,
      validation,
      attempts,
      questions: []
    };
  }

  const validation = {
    valid: true,
    errors: [],
    normalizedQuestions: acceptedQuestions,
    cleanedJson: { questions: acceptedQuestions }
  };
  return {
    status: "ready",
    rawJson: rawBatches,
    currentJson: fixedBatches,
    validation,
    attempts,
    questions: acceptedQuestions
  };
}

function validationAttempt(validation: QuestionValidationResult, accepted = 0, requested = 0): AiRepairAttempt {
  return {
    step: "validate",
    status: validation.valid ? "success" : "failed",
    message: validation.valid
      ? requested ? `${accepted + validation.normalizedQuestions.length} of ${requested} requested questions are valid.` : "All generated questions are valid and ready to add to your quiz."
      : "Some questions still have validation errors. Please review and fix them manually.",
    errorCount: validation.errors.length
  };
}

function validationWithParseError(validation: QuestionValidationResult, parseError?: string): QuestionValidationResult {
  if (!parseError) return validation;
  return {
    ...validation,
    errors: [{ field: "json", message: parseError }, ...validation.errors],
    valid: false
  };
}

function emptyValidation(): QuestionValidationResult {
  return {
    valid: false,
    errors: [],
    normalizedQuestions: [],
    cleanedJson: null
  };
}

function buildBatchPrompt(basePrompt: string, requestedCount: number, remainingCount: number, acceptedQuestions: BackendQuestionPayload[]) {
  const existing = acceptedQuestions
    .map((question, index) => `${index + 1}. ${question.questionText}`)
    .join("\n");
  return `${basePrompt}

IMPORTANT COUNT RULE:
- The user requested exactly ${requestedCount} total questions.
- You must return exactly ${remainingCount} additional questions in this response.
- Do not return fewer than ${remainingCount}.
- Do not return more than ${remainingCount}.
- Return valid JSON only, with a questions array containing exactly ${remainingCount} questions.

Already accepted questions to avoid duplicating:
${existing || "None yet."}`;
}

async function callAndTrack(
  settings: GeminiSettings,
  prompt: string,
  step: "generate" | "repair",
  addAttempt: (attempt: AiRepairAttempt) => void
): Promise<GeminiCallResult> {
  try {
    const result = await callGeminiWithSettings(settings, prompt);
    addAttempt({
      step,
      status: "success",
      message: result.parseError
        ? "AI returned invalid JSON. Repairing automatically."
        : step === "generate" ? "Gemini returned JSON." : "Gemini returned repaired JSON.",
      keyLabel: result.keyLabel,
      model: result.model
    });
    return result;
  } catch (error) {
    addAttempt({
      step,
      status: "failed",
      message: error instanceof Error ? error.message : "Gemini request failed."
    });
    throw error;
  }
}
