"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  Building2,
  ClipboardList,
  Compass,
  Home,
  KeyRound,
  LifeBuoy,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { clsx } from "clsx";
import { LinkButton } from "@/components/ui/button";

type ShellMode = "host" | "organization";

type WorkspaceShellProps = {
  mode?: ShellMode;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
};

const hostNav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/quizzes/create", label: "Create Quiz", icon: BookOpenCheck },
  { href: "/dashboard/explore", label: "Explore Quizzes", icon: Compass },
  { href: "/dashboard/host-passes", label: "Host Pass", icon: KeyRound },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 }
];

const organizationNav = [
  { href: "/admin", label: "Org Overview", icon: ShieldCheck },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/host-passes", label: "Host Passes", icon: KeyRound },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/ai-usage", label: "AI Audit", icon: Sparkles },
  { href: "/admin/workspace", label: "Workspace", icon: Building2 },
  { href: "/admin/knowledge-gaps", label: "Knowledge Gaps", icon: ClipboardList },
  { href: "/admin/organization-settings", label: "Org Settings", icon: Settings }
];

const shellCopy = {
  host: {
    brandSubtitle: "Educator Pro",
    search: "Search quizzes, rooms, participants",
    supportTitle: "Host support",
    supportText: "Help for quiz creation, live rooms, and participant limits."
  },
  organization: {
    brandSubtitle: "Organization Console",
    search: "Search people, passes, reports",
    supportTitle: "Organization operations",
    supportText: "Govern users, passes, analytics, and department programs."
  }
};

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex">
            <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/pricing">Pricing</Link>
            <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/join">Join Quiz</Link>
            <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/login">Login</Link>
          </nav>
          <LinkButton href="/register" size="sm">Host a Quiz</LinkButton>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function WorkspaceShell({
  mode = "host",
  children,
  title,
  subtitle,
  action
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const nav = mode === "host" ? hostNav : organizationNav;
  const copy = shellCopy[mode];
  const isOrganization = mode === "organization";
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[280px_1fr]">
      <aside className={clsx("hidden border-r lg:block", isOrganization ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white")}>
        <div className="sticky top-0 flex h-screen flex-col px-5 py-6">
          <Brand subtitle={copy.brandSubtitle} tone={isOrganization ? "dark" : "light"} />
          <nav className="mt-8 grid gap-1">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
              return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
                  isOrganization
                    ? active
                      ? "bg-white text-slate-950 shadow-card"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                    : active
                      ? "bg-brand-600 text-white shadow-card"
                      : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
            })}
          </nav>
          <div className={clsx("mt-auto rounded-xl border p-4", isOrganization ? "border-slate-700 bg-slate-900" : "border-brand-100 bg-brand-50")}>
            <div className={clsx("flex items-center gap-2 text-sm font-black", isOrganization ? "text-white" : "text-brand-700")}>
              <LifeBuoy size={16} />
              {copy.supportTitle}
            </div>
            <p className={clsx("mt-2 text-xs leading-5", isOrganization ? "text-slate-300" : "text-slate-600")}>{copy.supportText}</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="lg:hidden"><Brand subtitle={mode === "organization" ? "Organization Console" : undefined} /></div>
            <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex lg:max-w-md">
              <Search size={16} />
              {copy.search}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button aria-label="Notifications" className="focus-ring grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600">
                <Bell size={17} />
              </button>
              {mode === "host" ? <LinkButton href="/dashboard/quizzes/create" size="sm"><RadioTower size={15} />Host a Quiz</LinkButton> : null}
              {mode === "organization" ? <LinkButton href="/dashboard" variant="secondary" size="sm">Host workspace</LinkButton> : null}
              <div className="grid size-10 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-700">BS</div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {(title || subtitle || action) ? (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                {subtitle ? <p className="text-sm font-black uppercase tracking-wide text-brand-600">{subtitle}</p> : null}
                {title ? <h1 className="mt-1 text-3xl font-black text-ink md:text-4xl">{title}</h1> : null}
              </div>
              {action}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

export function OrganizationShell(props: Omit<WorkspaceShellProps, "mode">) {
  return <WorkspaceShell {...props} mode="organization" />;
}

export function MobileBottomNav({ mode = "host" }: { mode?: ShellMode }) {
  const pathname = usePathname();
  const nav = mode === "host" ? hostNav.slice(0, 4) : organizationNav.slice(0, 4);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white px-2 py-2 shadow-lifted lg:hidden">
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        return (
          <Link key={item.href} href={item.href} className={clsx("flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold", active ? "bg-brand-50 text-brand-700" : "text-slate-600")}>
            <item.icon size={17} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ subtitle, tone = "light" }: { subtitle?: string; tone?: "light" | "dark" }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      <span className={clsx("grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black shadow-card", tone === "dark" ? "bg-white text-slate-950" : "bg-brand-600 text-white")}>bQ</span>
      <span className="min-w-0">
        <span className={clsx("block truncate text-lg font-black", tone === "dark" ? "text-white" : "text-ink")}>biiQuiz Host</span>
        {subtitle ? <span className={clsx("block truncate text-xs font-bold", tone === "dark" ? "text-slate-300" : "text-slate-500")}>{subtitle}</span> : null}
      </span>
    </Link>
  );
}
