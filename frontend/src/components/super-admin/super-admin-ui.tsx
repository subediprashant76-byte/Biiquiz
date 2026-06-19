import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Eye, Search } from "lucide-react";
import { clsx } from "clsx";
import type { SuperAdminPagination } from "@/services/super-admin.service";
import { SuperAdminActionButton } from "@/components/super-admin/super-admin-actions";

type Stat = { label: string; value: string | number; detail?: string; tone?: string };
type Usage = { label: string; used: number; limit: number; percent: number };
type Row = Record<string, unknown>;

const titles: Record<string, { title: string; eyebrow: string; description: string }> = {
  dashboard: { title: "Console Overview", eyebrow: "Platform / Dashboard", description: "Platform health, approvals, payments, activity, and enterprise usage." },
  enterprises: { title: "Enterprise Management", eyebrow: "Platform / Enterprises", description: "Manage tenants, limits, status, and usage across the SaaS platform." },
  hosts: { title: "Host Directory", eyebrow: "Platform / Hosts", description: "Global educator directory with activity and tenant ownership." },
  students: { title: "Student Management", eyebrow: "Platform / Students", description: "Joined participants, activity status, and performance signals." },
  quizzes: { title: "Quiz Oversight", eyebrow: "Platform / Quizzes", description: "Review quiz status, host ownership, question counts, and room creation." },
  rooms: { title: "Live Room Management", eyebrow: "Platform / Rooms", description: "Monitor live and ended rooms, participants, winners, and room status." },
  analytics: { title: "Platform Analytics", eyebrow: "Management / Analytics", description: "Growth, engagement, revenue, plan usage, and enterprise comparison." },
  plans: { title: "Plans & Packages", eyebrow: "Management / Plans", description: "Pricing tiers, limits, and feature flags." },
  "upgrade-requests": { title: "Upgrade Requests", eyebrow: "Management / Upgrades", description: "Approve, reject, or contact enterprises requesting package upgrades." },
  payments: { title: "Manual Payment Verification", eyebrow: "Management / Payments", description: "Verify manual payments before activating plan changes." },
  domains: { title: "Domains & Infrastructure", eyebrow: "System / Domains", description: "Tenant domains, DNS status, SSL status, and website state." },
  "ai-settings": { title: "AI Settings & Quota", eyebrow: "System / AI", description: "Model defaults, fallback model, tenant quotas, and package AI access." },
  support: { title: "Support Tickets", eyebrow: "System / Support", description: "Ticket queue, priority, status, and support ownership." },
  "audit-logs": { title: "Platform Audit Logs", eyebrow: "System / Audit", description: "Actor, action, target, values, timestamps, and filters." },
  settings: { title: "Global Platform Settings", eyebrow: "System / Settings", description: "Branding, default limits, QR path, maintenance, and registration settings." }
};

export function PageHeader({ section, action }: { section: string; action?: React.ReactNode }) {
  const copy = titles[section] ?? titles.dashboard;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy.description}</p>
      </div>
      {action}
    </div>
  );
}

export function SearchFilterBar({
  placeholder = "Search by name, email, ID, or tenant",
  filters = {},
  plans = [],
  showPlan = false
}: {
  placeholder?: string;
  filters?: Record<string, unknown>;
  plans?: string[];
  showPlan?: boolean;
}) {
  return (
    <form className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-64 flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input name="search" defaultValue={String(filters.search ?? "")} className="h-10 w-full rounded border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#3525cd] focus:ring-2 focus:ring-indigo-100" placeholder={placeholder} />
      </div>
      <select name="status" defaultValue={String(filters.status ?? "")} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="suspended">Suspended</option>
        <option value="ended">Ended</option>
        <option value="verified">Verified</option>
      </select>
      {showPlan ? <select name="plan" defaultValue={String(filters.plan ?? "")} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"><option value="">All plans</option>{plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select> : null}
      <label className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">
        <input name="includeSamples" value="true" type="checkbox" defaultChecked={Boolean(filters.includeSamples)} className="size-4 accent-[#3525cd]" />
        Include samples
      </label>
      <button className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">Filter</button>
    </form>
  );
}

export function StatGrid({ stats = [] }: { stats?: Stat[] }) {
  if (!stats.length) return <EmptyState title="No metrics yet" text="Data will appear when records are available." />;
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => <DashboardStatCard key={stat.label} stat={stat} />)}
    </div>
  );
}

export function DashboardStatCard({ stat }: { stat: Stat }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{stat.label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{stat.value}</p>
      {stat.detail ? <p className="mt-1 text-xs font-semibold text-slate-500">{stat.detail}</p> : null}
    </div>
  );
}

export function StatusBadge({ value }: { value: unknown }) {
  const text = String(value ?? "-");
  const tone = text.toLowerCase();
  const classes = tone.includes("active") || tone.includes("verified") || tone.includes("paid")
    ? "bg-emerald-50 text-emerald-700"
    : tone.includes("pending")
      ? "bg-amber-50 text-amber-700"
      : tone.includes("reject") || tone.includes("failed") || tone.includes("suspend") || tone.includes("critical")
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-700";
  return <span className={clsx("inline-flex rounded px-2 py-1 text-xs font-black", classes)}>{text}</span>;
}

export function PlanBadge({ value }: { value: unknown }) {
  return <span className="inline-flex rounded bg-indigo-50 px-2 py-1 text-xs font-black uppercase text-[#3525cd]">{String(value ?? "free")}</span>;
}

export function UsageProgressCard({ usage }: { usage: Usage }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
        <span className="capitalize">{usage.label}</span>
        <span>{usage.used}/{usage.limit}</span>
      </div>
      <div className="h-2 rounded bg-slate-200">
        <div className={clsx("h-2 rounded", usage.percent >= 90 ? "bg-red-600" : "bg-[#3525cd]")} style={{ width: `${Math.min(100, usage.percent)}%` }} />
      </div>
    </div>
  );
}

export function DataTable({ columns, rows, empty = "No rows found." }: { columns: string[]; rows: Row[]; empty?: string }) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-black">{column}</th>)}<th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="border-t border-slate-100 hover:bg-slate-50">
                {columns.map((column) => <td key={column} className="px-4 py-3 font-medium text-slate-700">{renderCell(column, row[columnKey(column)] ?? row[column])}</td>)}
                <td className="px-4 py-3 text-right"><ActionMenu row={row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <EmptyState title={empty} text="Try changing filters or creating new records." /> : null}
    </div>
  );
}

export function PaginationControls({ pagination, basePath, filters = {} }: { pagination?: SuperAdminPagination; basePath: string; filters?: Record<string, unknown> }) {
  if (!pagination) return null;
  const href = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "" && value !== false) query.set(key, String(value));
    }
    query.set("page", String(page));
    query.set("pageSize", String(pagination.pageSize));
    return `${basePath}?${query.toString()}`;
  };
  const first = pagination.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const last = Math.min(pagination.total, pagination.page * pagination.pageSize);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
      <span>Showing {first}-{last} of {pagination.total}</span>
      <div className="flex items-center gap-2">
        {pagination.page > 1 ? <Link href={href(pagination.page - 1)} className="inline-flex h-9 items-center gap-1 rounded border border-slate-200 bg-white px-3 text-slate-700"><ArrowLeft size={14} />Previous</Link> : null}
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        {pagination.page < pagination.totalPages ? <Link href={href(pagination.page + 1)} className="inline-flex h-9 items-center gap-1 rounded border border-slate-200 bg-white px-3 text-slate-700">Next<ArrowRight size={14} /></Link> : null}
      </div>
    </div>
  );
}

export function ActionMenu({ row }: { row: Row }) {
  const href = row.detailHref ? String(row.detailHref) : "";
  const resourceSection = row.resourceSection ? String(row.resourceSection) : "";
  const resourceAction = row.resourceAction ? String(row.resourceAction) : "";
  return href ? (
    <Link href={href} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#3525cd]">
      <Eye size={14} />View
    </Link>
  ) : resourceSection && resourceAction ? <SuperAdminActionButton section={resourceSection} itemId={String(row.id)} action={resourceAction} label={String(row.resourceLabel ?? resourceAction)} /> : null;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="p-8 text-center"><p className="font-black text-slate-800">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{message}</div>;
}

export function LoadingState() {
  return <div className="rounded border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading...</div>;
}

export function FeatureBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{children}</span>;
}

function renderCell(column: string, value: unknown) {
  if (column.toLowerCase().includes("status")) return <StatusBadge value={value} />;
  if (column.toLowerCase().includes("plan")) return <PlanBadge value={value} />;
  if (column.toLowerCase().includes("usage") && Array.isArray(value)) return <div className="grid min-w-48 gap-2">{value.map((item) => <UsageProgressCard key={item.label} usage={item} />)}</div>;
  if (column.toLowerCase().includes("features") && Array.isArray(value)) return <div className="flex flex-wrap gap-1">{value.map((item) => <FeatureBadge key={String(item)}>{String(item)}</FeatureBadge>)}</div>;
  if (column.toLowerCase().includes("room code")) return <span className="font-mono text-xs font-bold text-slate-700">{String(value ?? "-")}</span>;
  if (column.toLowerCase().includes("created") || column.toLowerCase().includes("updated") || column.toLowerCase().includes("timestamp")) return formatDate(value);
  if (column.toLowerCase().includes("name") && typeof value === "object" && value && "label" in value) return value.label as React.ReactNode;
  return String(value ?? "-");
}

function columnKey(column: string) {
  const map: Record<string, string> = {
    Enterprise: "enterprise",
    Name: "name",
    Host: "host",
    Email: "email",
    Role: "role",
    Plan: "plan",
    Usage: "usage",
    Status: "status",
    Created: "createdAt",
    Updated: "updatedAt",
    Participants: "participants",
    Winner: "winner",
    Quiz: "quiz",
    Questions: "questions",
    Rooms: "rooms",
    Score: "score",
    Correct: "correct",
    Attempted: "attempted",
    Room: "room",
    "Room code": "roomCode",
    "Payer name": "payerName",
    "Transaction ID": "transactionId",
    Amount: "amount",
    Price: "price",
    Hosts: "hosts",
    Students: "students",
    AI: "ai",
    "Requested plan": "requestedPlan",
    Domain: "domain",
    DNS: "dnsStatus",
    SSL: "sslStatus",
    Website: "websiteStatus",
    Actor: "actor",
    Action: "action",
    Target: "target",
    "Old value": "oldValue",
    "New value": "newValue",
    Timestamp: "timestamp",
    Subject: "subject",
    Priority: "priority"
  };
  return map[column] ?? column.charAt(0).toLowerCase() + column.slice(1).replace(/\s+(\w)/g, (_, char: string) => char.toUpperCase());
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardSections({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-6">
        <SectionCard title="Pending approvals"><MiniRows rows={(data.pendingApprovals as Row[]) ?? []} /></SectionCard>
        <SectionCard title="Recent activity"><MiniRows rows={(data.recentActivity as Row[]) ?? []} /></SectionCard>
      </div>
      <div className="grid content-start gap-6">
        <SectionCard title="Pending payments"><MiniRows rows={(data.pendingPayments as Row[]) ?? []} /></SectionCard>
        <SectionCard title="Usage alerts"><MiniRows rows={(data.usageAlerts as Row[]) ?? []} /></SectionCard>
      </div>
    </div>
  );
}

function MiniRows({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="py-4 text-sm font-semibold text-slate-500">Nothing pending.</p>;
  return (
    <div className="grid gap-2">
      {rows.slice(0, 8).map((row, index) => (
        <div key={String(row.id ?? index)} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm">
          <span className="min-w-0 truncate font-bold text-slate-700">{String(row.enterprise ?? row.action ?? row.subject ?? row.metric ?? row.name ?? row.id ?? "Item")}</span>
          <span className="shrink-0 text-xs font-black text-slate-500">{String(row.status ?? row.timestamp ?? row.percent ?? "")}</span>
        </div>
      ))}
    </div>
  );
}

export function EnterpriseProfileCard({ enterprise }: { enterprise: Row }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Enterprise profile</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{String(enterprise.name)}</h2>
          <p className="mt-1 text-sm text-slate-500">{String(enterprise.slug)} · <PlanBadge value={enterprise.plan} /></p>
        </div>
        <StatusBadge value={enterprise.status} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.isArray(enterprise.usage) ? enterprise.usage.map((item) => <UsageProgressCard key={item.label} usage={item} />) : null}
      </div>
    </div>
  );
}

export function DownloadButton({ section }: { section: string }) {
  return <a href={`/api/super-admin/${section}/export`} className="inline-flex min-h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"><Download size={16} />Export</a>;
}

export function DetailLink({ href, label = "Open" }: { href: string; label?: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-sm font-black text-[#3525cd]">{label}<ArrowRight size={14} /></Link>;
}
