"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { QuestionValidationError } from "@/services/question-schema-validator";

export function ValidationErrorPanel({ errors }: { errors: QuestionValidationError[] }) {
  const [open, setOpen] = useState(false);
  if (!errors.length) return null;
  return (
    <Card className="border-red-100 bg-red-50">
      <CardBody>
        <div className="flex items-center gap-2 font-black text-red-700">
          <AlertTriangle size={18} />
          Some questions need review.
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-red-700">
          AI could not create fully valid questions yet. Please simplify your prompt or review the highlighted fields.
        </p>
        <Button type="button" variant="ghost" size="sm" className="mt-3 text-red-700" onClick={() => setOpen((current) => !current)}>
          {open ? "Hide details" : "View details"}
        </Button>
        {open ? (
          <ul className="mt-3 grid gap-2 text-sm font-semibold text-red-700">
            {errors.map((error, index) => (
              <li key={`${error.field}-${index}`}>
                {error.questionIndex !== undefined ? `Question ${error.questionIndex + 1}: ` : ""}
                {error.field} - {error.message}
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
