import { clsx } from "clsx";
import { CheckCircle2, Crown, Sparkles, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export function StatTile({
  label,
  value,
  detail,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "blue" | "green" | "orange" | "slate";
}) {
  const toneClasses = {
    blue: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <Card>
      <CardBody>
        <div
          className={clsx(
            "mb-4 inline-flex rounded-lg px-2.5 py-1 text-xs font-black",
            toneClasses[tone],
          )}
        >
          {label}
        </div>
        <p className="text-3xl font-black text-ink">{value}</p>
        {detail ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-wide text-brand-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-2xl font-black text-ink">{title}</h2>
      {text ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {text}
        </p>
      ) : null}
    </div>
  );
}

export function ProgressBars({
  values,
}: {
  values: Array<{ label: string; value: number; tone?: string }>;
}) {
  return (
    <div className="grid gap-4">
      {values.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">{item.label}</span>
            <span className="font-black text-ink">{item.value}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={clsx("h-2 rounded-full", item.tone ?? "bg-brand-600")}
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-black">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-100">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-4 font-medium text-slate-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs({ items }: { items: string[] }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
      {items.map((item, index) => (
        <button
          key={item}
          className={clsx(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold",
            index === 0
              ? "bg-brand-600 text-white shadow-card"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-8 text-center">
      <Sparkles className="mx-auto text-brand-600" />
      <h3 className="mt-3 text-lg font-black text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {text}
      </p>
      {actionHref && actionLabel ? (
        <LinkButton href={actionHref} className="mt-5">
          {actionLabel}
        </LinkButton>
      ) : null}
    </div>
  );
}

export function UpgradeRequiredModal({ mobile = false }: { mobile?: boolean }) {
  const benefits = [
    ["Up to 500 participants", "Host larger Rooms and corporate workshops."],
    ["Custom branding & logos", "Put your institution front and center."],
    ["AI Credits", "1,000 generator credits per month."],
    ["Priority support", "Response in under 2 hours."],
  ];
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white p-6 shadow-lifted",
        mobile ? "w-full" : "mx-auto max-w-3xl",
      )}
    >
      <div className="mx-auto grid size-24 place-items-center rounded-2xl bg-brand-600 text-white shadow-lifted">
        <Crown size={30} />
      </div>
      <div className="mt-6 text-center">
        <Badge tone="blue">Limited time offer</Badge>
        <h2 className="mt-4 text-3xl font-black text-ink">
          Participant Limit Reached
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
          Your current room has hit the 50-participant limit for the Free Plan.
          Upgrade now to keep the session going.
        </p>
      </div>
      <div
        className={clsx(
          "mt-8 grid gap-3",
          mobile ? "grid-cols-1" : "sm:grid-cols-2",
        )}
      >
        {benefits.map(([title, text]) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-brand-50 p-4"
          >
            <CheckCircle2 className="mt-1 shrink-0 text-brand-600" size={18} />
            <div>
              <p className="font-black text-ink">{title}</p>
              <p className="text-sm leading-5 text-slate-600">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div
        className={clsx(
          "mt-8 flex gap-3",
          mobile ? "flex-col" : "justify-center",
        )}
      >
        <Button size="lg" className={mobile ? "w-full" : "min-w-64"}>
          <TrendingUp size={18} />
          Upgrade to Host Pass
        </Button>
        <LinkButton
          href="/pricing"
          variant="secondary"
          size="lg"
          className={mobile ? "w-full" : ""}
        >
          Compare Plans
        </LinkButton>
      </div>
      <p className="mt-5 text-center text-sm font-bold text-slate-500">
        Secure checkout. No long-term commitment.
      </p>
    </div>
  );
}

export function AvatarName({
  name,
  detail,
}: {
  name: string;
  detail?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-700">
        {initials}
      </span>
      <span>
        <span className="block font-black text-ink">{name}</span>
        {detail ? (
          <span className="block text-xs font-semibold text-slate-500">
            {detail}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function MetricStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string | number;
    icon?: React.ElementType;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardBody className="flex items-center gap-4">
            {item.icon ? (
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <item.icon size={19} />
              </span>
            ) : null}
            <div>
              <p className="text-sm font-bold text-slate-500">{item.label}</p>
              <p className="text-2xl font-black text-ink">{item.value}</p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function UsersMiniIcon() {
  return <Users size={18} />;
}
