import { questionSchema } from "@/schemas/question.schema";

const supportedTypes = new Set(["single_correct"]);
const validDifficulties = new Set(["easy", "medium", "hard"]);
const optionKeys = ["A", "B", "C", "D"] as const;

export type BackendQuestionPayload = {
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

export type QuestionValidationError = {
  questionIndex?: number;
  field: string;
  message: string;
};

export type QuestionValidationResult = {
  valid: boolean;
  errors: QuestionValidationError[];
  normalizedQuestions: BackendQuestionPayload[];
  cleanedJson: unknown;
};

export function validateAiQuestionJson(value: unknown, startOrder = 1): QuestionValidationResult {
  const errors: QuestionValidationError[] = [];
  const root = isRecord(value) ? value : null;
  if (!root) {
    return {
      valid: false,
      errors: [{ field: "json", message: "Generated JSON must be an object." }],
      normalizedQuestions: [],
      cleanedJson: value
    };
  }

  const quiz = isRecord(root.quiz) ? root.quiz : root;
  const quizTitle = stringValue(quiz.title ?? root.quizTitle);
  const subject = stringValue(quiz.subject ?? root.subject);
  if (!quizTitle) errors.push({ field: "quiz.title", message: "Quiz title is required." });
  if (!subject) errors.push({ field: "quiz.subject", message: "Subject is required." });

  const questions = root.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push({ field: "questions", message: "At least one question is required." });
    return { valid: false, errors, normalizedQuestions: [], cleanedJson: root };
  }

  const normalizedQuestions = questions.flatMap((question, index) => {
    const normalized = normalizeQuestion(question, index, startOrder + index, errors);
    return normalized ? [normalized] : [];
  });

  const valid = errors.length === 0 && normalizedQuestions.length > 0;
  return {
    valid,
    errors,
    normalizedQuestions: valid ? normalizedQuestions : [],
    cleanedJson: root
  };
}

function normalizeQuestion(value: unknown, index: number, orderNumber: number, errors: QuestionValidationError[]) {
  if (!isRecord(value)) {
    errors.push({ questionIndex: index, field: "question", message: "Question must be an object." });
    return null;
  }

  const questionType = stringValue(value.questionType ?? value.type ?? "single_correct");
  if (!questionType || !supportedTypes.has(questionType)) {
    errors.push({
      questionIndex: index,
      field: "questionType",
      message: "Only single_correct multiple-choice questions are supported."
    });
  }

  const difficulty = stringValue(value.difficulty);
  if (difficulty && !validDifficulties.has(difficulty)) {
    errors.push({ questionIndex: index, field: "difficulty", message: "Difficulty must be easy, medium, or hard." });
  }

  const questionText = stringValue(value.questionText ?? value.text ?? value.question);
  if (!questionText || questionText.length < 5) {
    errors.push({ questionIndex: index, field: "questionText", message: "Question text is required." });
  }

  const options = normalizeOptions(value);
  if (!options) {
    errors.push({ questionIndex: index, field: "options", message: "Questions must include options A, B, C, and D." });
    return null;
  }

  const optionTexts = optionKeys.map((key) => options[key]);
  optionTexts.forEach((text, optionIndex) => {
    if (!text) errors.push({ questionIndex: index, field: `option${optionKeys[optionIndex]}`, message: "Option text cannot be empty." });
  });

  const duplicates = new Set<string>();
  for (const text of optionTexts) {
    const key = text.toLowerCase().replace(/\s+/g, " ").trim();
    if (duplicates.has(key)) {
      errors.push({ questionIndex: index, field: "options", message: "Duplicate options are not allowed." });
      break;
    }
    duplicates.add(key);
  }

  const correctOption = stringValue(value.correctOption ?? value.correctAnswer)?.toUpperCase();
  if (!isCorrectOption(correctOption)) {
    errors.push({ questionIndex: index, field: "correctAnswer", message: "Correct answer must match one of the options." });
  }

  const marks = numberValue(value.marks, 1);
  if (!Number.isInteger(marks) || marks < 1 || marks > 100) {
    errors.push({ questionIndex: index, field: "marks", message: "Marks must be between 1 and 100." });
  }

  const negativeMarks = numberValue(value.negativeMarks, 0);
  if (negativeMarks > marks) {
    errors.push({ questionIndex: index, field: "negativeMarks", message: "Negative marks cannot be greater than marks." });
  }
  if (negativeMarks > 0) {
    errors.push({ questionIndex: index, field: "negativeMarks", message: "Negative marking is not supported by this question backend." });
  }

  const timeLimit = numberValue(value.timeLimit ?? value.timerSeconds, 30);
  if (!Number.isInteger(timeLimit) || timeLimit < 5 || timeLimit > 300) {
    errors.push({ questionIndex: index, field: "timerSeconds", message: "Timer must be between 5 and 300 seconds." });
  }

  const payload = {
    questionText,
    optionA: options.A,
    optionB: options.B,
    optionC: options.C,
    optionD: options.D,
    correctOption: isCorrectOption(correctOption) ? correctOption : "A",
    marks,
    timeLimit,
    explanation: stringValue(value.explanation) ?? "",
    orderNumber
  };

  const parsed = questionSchema.safeParse(payload);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ questionIndex: index, field: issue.path.join("."), message: issue.message });
    }
  }
  return parsed.success ? parsed.data : null;
}

function normalizeOptions(value: Record<string, unknown>) {
  if (Array.isArray(value.options)) {
    const options: Record<"A" | "B" | "C" | "D", string> = { A: "", B: "", C: "", D: "" };
    for (const option of value.options) {
      if (!isRecord(option)) continue;
      const key = stringValue(option.key)?.toUpperCase();
      if (isCorrectOption(key)) options[key] = stringValue(option.text ?? option.label ?? option.value) ?? "";
    }
    return options;
  }

  const options = {
    A: stringValue(value.optionA) ?? "",
    B: stringValue(value.optionB) ?? "",
    C: stringValue(value.optionC) ?? "",
    D: stringValue(value.optionD) ?? ""
  };
  return optionKeys.some((key) => options[key]) ? options : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return String(value).trim();
}

function numberValue(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === "") return fallback;
  return Number(value);
}

function isCorrectOption(value: unknown): value is "A" | "B" | "C" | "D" {
  return typeof value === "string" && optionKeys.includes(value as "A" | "B" | "C" | "D");
}
