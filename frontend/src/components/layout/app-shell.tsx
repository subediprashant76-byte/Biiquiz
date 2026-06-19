import Link from "next/link";
import { BookOpenCheck, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/quizzes/create", label: "Create Quiz", icon: BookOpenCheck },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/pricing", label: "Pricing", icon: Sparkles }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-black text-ink">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white">bQ</span>
            biiQuiz Host
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LinkButton href="/join" variant="secondary">Join</LinkButton>
            <LinkButton href="/login">Login</LinkButton>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

