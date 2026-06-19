"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Plus, X } from "lucide-react";

type ActionTone = "primary" | "danger" | "neutral";

type SelectOption = { value: string; label: string };

export function SuperAdminCreateDialog({ section, options = [] }: { section: "enterprises" | "plans" | "domains" | "support"; options?: SelectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const labels = { enterprises: "New Enterprise", plans: "Create Plan", domains: "Add Domain", support: "New Ticket" };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    if (section === "plans") payload.features = String(payload.features ?? "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
    const response = await fetch(`/api/super-admin/${section}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      setMessage(body.error?.message ?? "Save failed.");
      return;
    }
    setOpen(false);
    setMessage("");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded bg-[#3525cd] px-4 text-sm font-black text-white"><Plus size={16} />{labels[section]}</button>
      {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-5 shadow-xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">{labels[section]}</h2><button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded border border-slate-200" aria-label="Close"><X size={16} /></button></div><div className="grid gap-4 sm:grid-cols-2">{section === "enterprises" ? <><Field name="name" label="Enterprise name" defaultValue="" /><Field name="slug" label="URL slug" defaultValue="" /><SelectField name="plan" label="Plan" options={options} /><Field name="primaryContactName" label="Primary contact" defaultValue="" /><Field name="primaryContactEmail" label="Contact email" type="email" defaultValue="" /></> : null}{section === "plans" ? <><Field name="name" label="Plan name" defaultValue="" /><Field name="code" label="Plan code" defaultValue="" /><Field name="description" label="Description" defaultValue="" /><Field name="priceCents" label="Price in cents" type="number" defaultValue="0" /><Field name="currency" label="Currency" defaultValue="USD" /><Field name="hostLimit" label="Host limit" type="number" defaultValue="1" /><Field name="studentLimit" label="Student limit" type="number" defaultValue="50" /><Field name="quizLimit" label="Quiz limit" type="number" defaultValue="20" /><Field name="roomLimit" label="Room limit" type="number" defaultValue="10" /><Field name="storageLimitMb" label="Storage MB" type="number" defaultValue="1024" /><Field name="aiAccessMode" label="AI access: disabled, byok, managed" defaultValue="byok" /><Field name="aiMonthlyQuestionLimit" label="AI monthly questions" type="number" defaultValue="0" /><Field name="features" label="Features, comma or newline separated" defaultValue="" /></> : null}{section === "domains" ? <><SelectField name="organizationId" label="Enterprise" options={options} /><Field name="domain" label="Domain" defaultValue="" /></> : null}{section === "support" ? <><SelectField name="organizationId" label="Enterprise" options={options} /><Field name="subject" label="Subject" defaultValue="" /><Field name="description" label="Description" defaultValue="" /><SelectField name="priority" label="Priority" options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }]} /></> : null}</div><div className="mt-5 flex items-center gap-3"><button className="min-h-10 rounded bg-[#3525cd] px-4 text-sm font-black text-white">Save</button><button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded border border-slate-200 px-4 text-sm font-bold">Cancel</button>{message ? <span className="text-sm font-bold text-slate-500">{message}</span> : null}</div></form></div> : null}
    </>
  );
}

export function SuperAdminActionButton({
  section,
  itemId,
  action,
  label,
  tone = "neutral"
}: {
  section: string;
  itemId: string;
  action: string;
  label: string;
  tone?: ActionTone;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAction() {
    const destructive = ["suspend", "reject", "disable", "archive", "close"].includes(action);
    if (destructive && !window.confirm(`Confirm ${label.toLowerCase()}? This action is audited.`)) return;
    const needsNote = ["suspend", "reject", "contact"].includes(action);
    const note = needsNote ? window.prompt("Add an admin note (optional):") : "";
    if (needsNote && note === null) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/super-admin/${section}/${encodeURIComponent(itemId)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || undefined, reason: action === "suspend" ? note || undefined : undefined })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message ?? "Action failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={runAction}
        disabled={loading}
        className={clsx(
          "min-h-9 rounded px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-60",
          tone === "primary" && "bg-[#3525cd] text-white",
          tone === "danger" && "bg-red-50 text-red-700",
          tone === "neutral" && "border border-slate-200 bg-white text-slate-700"
        )}
      >
        {loading ? "Working..." : label}
      </button>
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </span>
  );
}

export function PlatformSettingsForm({ settings }: { settings: Record<string, unknown> }) {
  return (
    <SettingsForm endpoint="/api/super-admin/settings" booleanFields={["maintenanceMode", "registrationEnabled"]}>
      <Field name="branding" label="Platform branding" defaultValue={String(settings.branding ?? "")} />
      <Field name="defaultPlan" label="Default plan" defaultValue={String(settings.defaultPlan ?? "")} />
      <Field name="defaultLimit" label="Default participant limit" type="number" defaultValue={String(settings.defaultLimit ?? "")} />
      <Field name="paymentQrImage" label="Payment QR image path" defaultValue={String(settings.paymentQrImage ?? "")} />
      <Toggle name="maintenanceMode" label="Maintenance mode" defaultChecked={Boolean(settings.maintenanceMode)} />
      <Toggle name="registrationEnabled" label="Registration enabled" defaultChecked={settings.registrationEnabled !== false} />
    </SettingsForm>
  );
}

export function AiSettingsForm({ data }: { data: Record<string, unknown> }) {
  const quota = Array.isArray(data.quota) ? data.quota as Record<string, unknown>[] : [];
  return (
    <SettingsForm endpoint="/api/super-admin/ai-settings" booleanFields={["enabled"]}>
      <Field name="model" label="Primary model" defaultValue={String(data.model ?? "")} />
      <Field name="fallbackModel" label="Fallback model" defaultValue={String(data.fallbackModel ?? "")} />
      <Toggle name="enabled" label="AI configuration enabled" defaultChecked={Boolean(data.enabled)} />
      {quota.map((item) => {
        const plan = String(item.plan);
        return <div key={plan} className="grid gap-3 rounded border border-slate-200 p-3"><strong className="text-sm capitalize">{plan}</strong><Field name={`${plan}AiAccess`} label="Access mode" defaultValue={String(item.aiAccess ?? "")} /><Field name={`${plan}MonthlyQuestions`} label="Monthly question limit" type="number" defaultValue={String(item.monthlyQuestions ?? "")} /></div>;
      })}
    </SettingsForm>
  );
}

function SettingsForm({ endpoint, children, booleanFields = [] }: { endpoint: string; children: React.ReactNode; booleanFields?: string[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });
    for (const field of booleanFields) payload[field] = formData.get(field) === "on";
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      setMessage(body.error?.message ?? "Save failed.");
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      {children}
      <div className="flex items-center gap-3 md:col-span-2">
        <button className="min-h-10 rounded bg-[#3525cd] px-4 text-sm font-black text-white">Save changes</button>
        {message ? <span className="text-sm font-bold text-slate-500">{message}</span> : null}
      </div>
    </form>
  );
}

function Field({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue: string; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="h-10 rounded border border-slate-200 bg-white px-3 font-semibold outline-none focus:border-[#3525cd] focus:ring-2 focus:ring-indigo-100" />
    </label>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: SelectOption[] }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} required className="h-10 rounded border border-slate-200 bg-white px-3 font-semibold"><option value="">Select</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-[#3525cd]" />
      {label}
    </label>
  );
}
