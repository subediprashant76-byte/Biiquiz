import { clsx } from "clsx";

export function Badge({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "orange" | "red" | "slate" }) {
  const tones = {
    blue: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700"
  };
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

