"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  FileClock,
  GraduationCap,
  HelpCircle,
  Home,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Network,
  Package,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  Users
} from "lucide-react";
import { clsx } from "clsx";

const navGroups = [
  {
    label: "Platform",
    items: [
      { href: "/super-admin/dashboard", label: "Dashboard", icon: Home },
      { href: "/super-admin/enterprises", label: "Enterprises", icon: Building2 },
      { href: "/super-admin/hosts", label: "Hosts", icon: Users },
      { href: "/super-admin/students", label: "Students", icon: GraduationCap },
      { href: "/super-admin/quizzes", label: "Quizzes", icon: ClipboardList },
      { href: "/super-admin/rooms", label: "Live Rooms", icon: RadioTower }
    ]
  },
  {
    label: "Management",
    items: [
      { href: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/super-admin/plans", label: "Plans", icon: Package },
      { href: "/super-admin/upgrade-requests", label: "Upgrade Requests", icon: BadgeDollarSign },
      { href: "/super-admin/payments", label: "Payments", icon: CreditCard },
      { href: "/super-admin/domains", label: "Domains", icon: Network },
      { href: "/super-admin/ai-settings", label: "AI Settings", icon: Bot }
    ]
  },
  {
    label: "System",
    items: [
      { href: "/super-admin/support", label: "Support", icon: Ticket },
      { href: "/super-admin/audit-logs", label: "Audit Logs", icon: FileClock },
      { href: "/super-admin/settings", label: "Settings", icon: Settings }
    ]
  }
];

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#1b1b24]">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-6 py-7">
          <Link href="/super-admin/dashboard" className="text-xl font-black text-[#3525cd]">biiQuiz</Link>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Super Admin Console</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
              <div className="grid gap-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/super-admin/dashboard" && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex min-h-10 items-center gap-3 rounded px-3 text-sm font-bold transition",
                        active ? "border-r-4 border-[#3525cd] bg-indigo-50 text-[#3525cd]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      )}
                    >
                      <item.icon size={17} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button onClick={logout} className="flex min-h-10 w-full items-center gap-3 rounded px-3 text-sm font-bold text-red-700 hover:bg-red-50">
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link href="/super-admin/dashboard" className="grid size-10 place-items-center rounded bg-[#3525cd] font-black text-white md:hidden">bQ</Link>
              <div className="hidden w-full max-w-md items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex">
                <Search size={16} />
                Search enterprises, hosts, students, rooms
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="grid size-10 place-items-center rounded border border-slate-200 bg-white text-slate-600">
                <Bell size={17} />
              </button>
              <Link href="/profile" className="hidden items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 sm:flex">
                <ShieldCheck size={16} />
                Super Admin
              </Link>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export const superAdminIcons = {
  Activity,
  LayoutGrid,
  LifeBuoy,
  KeyRound,
  HelpCircle
};
