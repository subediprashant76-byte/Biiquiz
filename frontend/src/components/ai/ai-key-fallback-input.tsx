"use client";

import { Field, Textarea } from "@/components/ui/form";

export function AIKeyFallbackInput({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Fallback Gemini API keys" hint="Paste multiple keys separated by comma or newline. Full keys are never displayed after you type them.">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"AIza...fallback1\nAIza...fallback2"}
        className="min-h-24"
      />
    </Field>
  );
}
