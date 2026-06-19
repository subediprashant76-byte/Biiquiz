"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerateQuestionsButton({ loading }: { loading: boolean }) {
  return (
    <Button disabled={loading} size="lg">
      <Sparkles size={16} />
      {loading ? "Generating..." : "Generate Questions"}
    </Button>
  );
}

export function ApplyQuestionsToQuizButton({
  disabled,
  saving,
  onClick
}: {
  disabled: boolean;
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" disabled={disabled || saving} onClick={onClick} size="lg" variant="success">
      {saving ? "Saving..." : "Apply to Quiz"}
    </Button>
  );
}

export function ClearAIDraftButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" disabled={disabled} onClick={onClick}>
      Clear AI Draft
    </Button>
  );
}
