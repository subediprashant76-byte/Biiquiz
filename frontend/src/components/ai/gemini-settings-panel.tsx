"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, KeyRound, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AIKeyFallbackInput } from "@/components/ai/ai-key-fallback-input";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { maskGeminiKey, type GeminiSettings } from "@/services/gemini-client.service";

export type GeminiSettingsState = GeminiSettings & {
  enabled: boolean;
  rememberKeys: boolean;
  repairAttempts: number;
};

const storageKey = "biiquiz_quick_ai_gemini_settings";

export function GeminiSettingsPanel({
  value,
  onChange,
  compact = false
}: {
  value: GeminiSettingsState;
  onChange: (value: GeminiSettingsState) => void;
  compact?: boolean;
}) {
  const [fallbackText, setFallbackText] = useState(value.fallbackApiKeys.join("\n"));
  const [open, setOpen] = useState(false);
  const activeLabels = useMemo(
    () => [value.primaryApiKey, ...value.fallbackApiKeys].filter(Boolean).map((key, index) => maskGeminiKey(key, index)),
    [value.primaryApiKey, value.fallbackApiKeys]
  );

  useEffect(() => {
    setFallbackText(value.fallbackApiKeys.join("\n"));
  }, [value.fallbackApiKeys]);

  function update(next: GeminiSettingsState) {
    onChange(next);
    if (next.rememberKeys) {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }

  function updateFallbackKeys(text: string) {
    setFallbackText(text);
    update({
      ...value,
      fallbackApiKeys: text.split(/[\n,]+/).map((key) => key.trim()).filter(Boolean)
    });
  }

  const fields = (
    <div className="mt-4 grid gap-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={value.enabled} onChange={(event) => update({ ...value, enabled: event.target.checked })} />
        Enable generation
      </label>
      <Field label="Primary Gemini API key">
        <Input
          type="password"
          value={value.primaryApiKey}
          onChange={(event) => update({ ...value, primaryApiKey: event.target.value.trim() })}
          placeholder="AIza..."
        />
      </Field>
      <AIKeyFallbackInput value={fallbackText} onChange={updateFallbackKeys} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Primary model">
          <Input
            value={value.primaryModel}
            onChange={(event) => update({ ...value, primaryModel: event.target.value.trim() })}
            placeholder="gemini-2.5-flash"
          />
        </Field>
        <Field label="Fallback models" hint="Comma or newline separated.">
          <Textarea
            value={value.fallbackModels.join("\n")}
            onChange={(event) => update({ ...value, fallbackModels: event.target.value.split(/[\n,]+/).map((model) => model.trim()).filter(Boolean) })}
            placeholder="gemini-2.0-flash"
            className="min-h-11"
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Repair attempts">
          <Input
            type="number"
            min={0}
            max={5}
            value={value.repairAttempts}
            onChange={(event) => update({ ...value, repairAttempts: Number(event.target.value) })}
          />
        </Field>
        <Field label="Max output tokens">
          <Input
            type="number"
            min={1024}
            max={32768}
            value={value.maxOutputTokens}
            onChange={(event) => update({ ...value, maxOutputTokens: Number(event.target.value) })}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={value.rememberKeys} onChange={(event) => update({ ...value, rememberKeys: event.target.checked })} />
        Remember on this device
      </label>
      {activeLabels.length ? (
        <div className="rounded-lg bg-white/80 p-3 text-xs font-semibold text-slate-600">
          <ShieldCheck className="mb-2 text-success-500" size={16} />
          Active keys: {activeLabels.join(", ")}
        </div>
      ) : null}
    </div>
  );

  const content = (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="flex items-start gap-3">
          <SlidersHorizontal className="mt-0.5 text-brand-600" size={20} />
          <span>
            <span className="block font-black text-ink">Advanced AI Settings</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              Add your Gemini key and optional fallback settings. Keys stay in this browser.
            </span>
          </span>
        </span>
        <ChevronDown className={open ? "shrink-0 rotate-180 text-slate-500 transition" : "shrink-0 text-slate-500 transition"} size={20} />
      </button>
      {!open && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <KeyRound size={14} className="text-brand-600" />
          {activeLabels.length ? `${activeLabels.length} Gemini key${activeLabels.length === 1 ? "" : "s"} ready` : "Gemini key required before generating"}
        </div>
      )}
      {open ? fields : null}
    </div>
  );

  if (compact) {
    return <div className="rounded-xl border border-blue-100 bg-brand-50 p-4">{content}</div>;
  }

  return (
    <Card className="border-blue-100 bg-brand-50">
      <CardBody className="grid gap-4">
        {content}
      </CardBody>
    </Card>
  );
}

export function readSavedGeminiSettings(defaults: GeminiSettingsState): GeminiSettingsState {
  if (typeof window === "undefined") return defaults;
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return defaults;
  try {
    return { ...defaults, ...(JSON.parse(saved) as Partial<GeminiSettingsState>), rememberKeys: true };
  } catch {
    return defaults;
  }
}
