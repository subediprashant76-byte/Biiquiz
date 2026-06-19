"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

const storageKey = "biiquiz_gemini_keys";

export function GeminiKeyManager({
  onKeysChange
}: {
  onKeysChange?: (keys: string[]) => void;
}) {
  const [keys, setKeys] = useState<string[]>([""]);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      setKeys(parsed.length ? parsed : [""]);
      setRemember(true);
      onKeysChange?.(parsed);
    }
  }, [onKeysChange]);

  function update(next: string[], rememberKeys = remember) {
    setKeys(next);
    onKeysChange?.(next.filter(Boolean));
    if (rememberKeys) window.localStorage.setItem(storageKey, JSON.stringify(next.filter(Boolean)));
    else window.localStorage.removeItem(storageKey);
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-brand-50 p-5 shadow-card">
      <div className="mb-3 flex items-start gap-3">
        <KeyRound className="mt-0.5 text-brand-600" size={20} />
        <div>
          <p className="font-black text-ink">1. Add your Gemini API keys</p>
          <p className="text-sm text-slate-600">
            Keys are used only in this browser to call Gemini directly. They are never sent to the biiQuiz backend.
          </p>
        </div>
      </div>
      <div className="grid gap-3">
        {keys.map((key, index) => (
          <div key={index} className="flex items-end gap-2">
            <Field label={index === 0 ? "Gemini key" : `Fallback key ${index + 1}`}>
              <Input
                type="password"
                value={key}
                placeholder="AIza..."
                onChange={(event) => {
                  const next = [...keys];
                  next[index] = event.target.value.trim();
                  update(next);
                }}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              className="mb-0"
              aria-label="Remove key"
              onClick={() => update(keys.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => update([...keys, ""])}>
            <Plus size={16} />
            Add fallback key
          </Button>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => {
                setRemember(event.target.checked);
                update(keys, event.target.checked);
              }}
            />
            Remember on this device
          </label>
        </div>
      </div>
    </div>
  );
}
