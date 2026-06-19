import Link from "next/link";
import { AiSettingsForm, PlatformSettingsForm, SuperAdminActionButton, SuperAdminCreateDialog } from "@/components/super-admin/super-admin-actions";
import {
  DashboardSections,
  DataTable,
  DetailLink,
  DownloadButton,
  EmptyState,
  EnterpriseProfileCard,
  PageHeader,
  PaginationControls,
  SearchFilterBar,
  SectionCard,
  StatGrid,
  StatusBadge,
  UsageProgressCard
} from "@/components/super-admin/super-admin-ui";
import type { SuperAdminPagination } from "@/services/super-admin.service";

type AnyRow = Record<string, unknown>;

const tableColumns: Record<string, string[]> = {
  enterprises: ["Name", "Plan", "Usage", "Status", "Created"],
  hosts: ["Name", "Email", "Enterprise", "Status", "Created"],
  students: ["Name", "Enterprise", "Room", "Score", "Correct", "Attempted", "Status"],
  quizzes: ["Title", "Host", "Enterprise", "Status", "Questions", "Rooms", "Updated"],
  rooms: ["Name", "Room code", "Quiz", "Enterprise", "Participants", "Winner", "Status", "Created"],
  payments: ["Enterprise", "Payer name", "Transaction ID", "Amount", "Status"],
  domains: ["Enterprise", "Domain", "DNS", "SSL", "Website"],
  support: ["Subject", "Enterprise", "Priority", "Status", "Created"],
  "audit-logs": ["Actor", "Action", "Target", "Old value", "New value", "Timestamp"],
  "upgrade-requests": ["Enterprise", "Requested plan", "Status", "Created"]
};

export function SuperAdminSection({ section, data }: { section: string; data: Record<string, unknown> }) {
  if (section === "dashboard") {
    return (
      <>
        <PageHeader section={section} />
        <StatGrid stats={data.stats as never[]} />
        <DashboardSections data={data} />
        <SectionCard title="Top enterprises" action={<DetailLink href="/super-admin/enterprises" label="View all" />}>
          <DataTable columns={["Name", "Plan", "Usage", "Status", "Created"]} rows={prepareEnterpriseRows((data.topEnterprises as AnyRow[]) ?? [])} />
        </SectionCard>
      </>
    );
  }

  if (section === "analytics") {
    return (
      <>
        <PageHeader section={section} action={<DownloadButton section={section} />} />
        <StatGrid stats={data.stats as never[]} />
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Enterprise comparison">
            <DataTable columns={["Name", "Plan", "Usage", "Status"]} rows={prepareEnterpriseRows((data.enterpriseComparison as AnyRow[]) ?? [])} />
          </SectionCard>
          <SectionCard title="Host activity">
            <DataTable columns={["Name", "Email", "Enterprise", "Status"]} rows={(data.hostActivity as AnyRow[]) ?? []} />
          </SectionCard>
        </div>
        <SectionCard title="Plan usage">
          <div className="grid gap-3 sm:grid-cols-3">{((data.planUsage as AnyRow[]) ?? []).map((row) => <div key={String(row.label)} className="rounded bg-slate-50 p-4"><p className="text-sm font-black capitalize text-slate-700">{String(row.label)}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{String(row.value)}</p></div>)}</div>
        </SectionCard>
      </>
    );
  }

  if (section === "plans") {
    return (
      <>
        <PageHeader section={section} action={<SuperAdminCreateDialog section="plans" />} />
        <StatGrid stats={data.stats as never[]} />
        <CollectionToolbar section={section} data={data} />
        <div className="grid gap-4 lg:grid-cols-3">
          {((data.rows as AnyRow[]) ?? []).map((plan) => (
            <SectionCard key={String(plan.id)} title={String(plan.name)}>
              <p className="text-2xl font-semibold text-slate-950">{String(plan.price)}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p>{String(plan.hosts)} hosts · {String(plan.students)} students</p>
                <p>{String(plan.quizzes)} quizzes · {String(plan.rooms)} rooms</p>
                <p>AI: {String(plan.ai)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">{Array.isArray(plan.features) ? plan.features.map((feature) => <span key={String(feature)} className="rounded bg-indigo-50 px-2 py-1 text-xs font-bold text-[#3525cd]">{String(feature)}</span>) : null}</div>
              <div className="mt-4 flex gap-2">
                <SuperAdminActionButton section="plans" itemId={String(plan.id)} action={String(plan.status) === "Active" ? "archive" : "activate"} label={String(plan.status) === "Active" ? "Archive" : "Activate"} tone={String(plan.status) === "Active" ? "danger" : "primary"} />
              </div>
            </SectionCard>
          ))}
        </div>
        <SectionCard title="Package limit matrix">
          <DataTable columns={["Name", "Price", "Hosts", "Students", "Quizzes", "Rooms", "AI"]} rows={(data.rows as AnyRow[]) ?? []} />
        </SectionCard>
        <CollectionPager section={section} data={data} />
      </>
    );
  }

  if (section === "ai-settings") {
    return (
      <>
        <PageHeader section={section} action={<SuperAdminCreateDialog section="domains" options={organizationOptions(data)} />} />
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <SectionCard title="Model settings">
            <AiSettingsForm data={data} />
          </SectionCard>
          <SectionCard title="Package AI quota">
            <DataTable columns={["plan", "aiAccess", "monthlyQuestions"]} rows={(data.quota as AnyRow[]) ?? []} />
          </SectionCard>
        </div>
        <SectionCard title="Recent AI usage by model">
          <MiniMetricGrid rows={(data.usage as AnyRow[]) ?? []} />
        </SectionCard>
      </>
    );
  }

  if (section === "settings") {
    const settings = (data.settings as AnyRow) ?? {};
    return (
      <>
        <PageHeader section={section} action={<SuperAdminCreateDialog section="support" options={organizationOptions(data)} />} />
        <StatGrid stats={data.stats as never[]} />
        <SectionCard title="Platform configuration">
          <PlatformSettingsForm settings={settings} />
        </SectionCard>
      </>
    );
  }

  if (section === "upgrade-requests") {
    const rows = prepareRows(section, (data.rows as AnyRow[]) ?? []);
    return (
      <>
        <PageHeader section={section} action={<DetailLink href="/super-admin/payments" label="Review payments" />} />
        <StatGrid stats={data.stats as never[]} />
        <CollectionToolbar section={section} data={data} placeholder="Search upgrade requests by enterprise or plan" />
        <div className="grid gap-4">
          {rows.length ? rows.map((row) => <UpgradeRequestCard key={String(row.id)} row={row} />) : <EmptyState title="No upgrade requests" text="Requests submitted by enterprises will appear here." />}
        </div>
        <CollectionPager section={section} data={data} />
      </>
    );
  }

  if (section === "payments") {
    const rows = prepareRows(section, (data.rows as AnyRow[]) ?? []);
    return (
      <>
        <PageHeader section={section} action={<DetailLink href="/super-admin/upgrade-requests" label="Upgrade queue" />} />
        <StatGrid stats={data.stats as never[]} />
        <CollectionToolbar section={section} data={data} placeholder="Search payer, transaction ID, or enterprise" />
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.length ? rows.map((row) => <PaymentVerificationCard key={String(row.id)} row={row} />) : <EmptyState title="No manual payments" text="Institute payment submissions will appear here for verification." />}
        </div>
        <CollectionPager section={section} data={data} />
      </>
    );
  }

  if (section === "domains") {
    const rows = prepareRows(section, (data.rows as AnyRow[]) ?? []);
    return (
      <>
        <PageHeader section={section} />
        <StatGrid stats={data.stats as never[]} />
        <CollectionToolbar section={section} data={data} placeholder="Search tenant domains, DNS, SSL, or website status" />
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <DataTable columns={tableColumns.domains} rows={rows} />
          <SectionCard title="Infrastructure checks">
            <div className="grid gap-3 text-sm font-semibold text-slate-600">
              <p>DNS, SSL, and website statuses are persisted for each tenant domain.</p>
              <p>Use the row action to record a completed infrastructure verification.</p>
            </div>
          </SectionCard>
        </div>
        <CollectionPager section={section} data={data} />
      </>
    );
  }

  if (section === "support") {
    const rows = prepareRows(section, (data.rows as AnyRow[]) ?? []);
    return (
      <>
        <PageHeader section={section} />
        <StatGrid stats={data.stats as never[]} />
        <CollectionToolbar section={section} data={data} placeholder="Search tickets, enterprise, priority, or status" />
        <SectionCard title="Ticket queue">
          <DataTable columns={tableColumns.support} rows={rows} empty="No support tickets found." />
        </SectionCard>
        <CollectionPager section={section} data={data} />
      </>
    );
  }

  if (section === "audit-logs") {
    const rows = prepareRows(section, (data.rows as AnyRow[]) ?? []);
    return (
      <>
        <PageHeader section={section} action={<DownloadButton section={section} />} />
        <StatGrid stats={data.stats as never[]} />
        <CollectionToolbar section={section} data={data} placeholder="Search actor, action, target, or enterprise" />
        <SectionCard title="Immutable audit trail">
          <DataTable columns={tableColumns["audit-logs"]} rows={rows} empty="No audit events found." />
        </SectionCard>
        <CollectionPager section={section} data={data} />
      </>
    );
  }

  if (section === "hosts" || section === "students" || section === "quizzes" || section === "rooms") {
    const rows = prepareRows(section, (data.rows as AnyRow[]) ?? []);
    return (
      <>
      <PageHeader section={section} action={<DownloadButton section={section} />} />
        <StatGrid stats={data.stats as never[]} />
        <CollectionToolbar section={section} data={data} />
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <DataTable columns={tableColumns[section] ?? ["Name", "Status", "Created"]} rows={rows} />
          <SectionCard title={section === "rooms" ? "Leaderboard access" : "Operational controls"}>
            <div className="grid gap-3 text-sm font-semibold text-slate-600">
              <p>{section === "rooms" ? "Room rows use real participants, winners, and status from the database." : "Rows are scoped from the shared user, quiz, room, and participant tables."}</p>
              <p>Use search and status filters to narrow the directory without leaving the console.</p>
            </div>
          </SectionCard>
        </div>
        <CollectionPager section={section} data={data} />
      </>
    );
  }

  const rows = prepareRows(section, (data.rows as AnyRow[]) ?? []);
  return (
    <>
      <PageHeader section={section} action={section === "enterprises" ? <div className="flex gap-2"><SuperAdminCreateDialog section="enterprises" options={((data.plans as string[]) ?? []).map((plan) => ({ value: plan, label: plan }))} /><DownloadButton section={section} /></div> : <DownloadButton section={section} />} />
      <StatGrid stats={data.stats as never[]} />
      <CollectionToolbar section={section} data={data} />
      <DataTable columns={tableColumns[section] ?? ["Name", "Status", "Created"]} rows={rows} />
      <CollectionPager section={section} data={data} />
    </>
  );
}

export function EnterpriseDetail({ data }: { data: Record<string, unknown> }) {
  const enterprise = data.enterprise as AnyRow;
  const tabs = (data.tabs as string[]) ?? [];
  const activeTab = String(data.activeTab ?? "overview");
  return (
    <>
      <PageHeader section="enterprises" action={<div className="flex flex-wrap gap-2"><Link href="/super-admin/enterprises" className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Back to enterprises</Link>{String(enterprise.status).toLowerCase() === "suspended" ? <SuperAdminActionButton section="enterprises" itemId={String(enterprise.id)} action="reactivate" label="Reactivate" tone="primary" /> : <SuperAdminActionButton section="enterprises" itemId={String(enterprise.id)} action="suspend" label="Suspend" tone="danger" />}</div>} />
      <EnterpriseProfileCard enterprise={enterprise} />
      <div className="mt-6 overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-6">
          {tabs.map((tab) => { const key = enterpriseTabKey(tab); return <Link key={tab} href={`/super-admin/enterprises/${enterprise.id}?tab=${key}`} className={key === activeTab ? "border-b-2 border-[#3525cd] pb-3 text-sm font-black text-[#3525cd]" : "pb-3 text-sm font-bold text-slate-500"}>{tab}</Link>; })}
        </div>
      </div>
      <div className="mt-6 grid gap-6">
        {activeTab === "overview" ? <><StatGrid stats={((data.overview as AnyRow)?.stats as never[]) ?? []} /><SectionCard title="Usage limits">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.isArray(enterprise.usage) ? enterprise.usage.map((item) => <UsageProgressCard key={String((item as AnyRow).label)} usage={item as never} />) : null}
          </div>
        </SectionCard></> : null}
        {activeTab === "people" ? <SectionCard title="Admins & Hosts"><DataTable columns={["Name", "Email", "Role", "Status"]} rows={(data.adminsHosts as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "students" ? <SectionCard title="Students"><DataTable columns={["Name", "Room", "Score", "Correct", "Attempted", "Status"]} rows={(data.students as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "quizzes" ? <SectionCard title="Quizzes"><DataTable columns={["Title", "Host", "Status", "Questions", "Rooms", "Updated"]} rows={(data.quizzes as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "rooms" ? <SectionCard title="Live Rooms"><DataTable columns={["Name", "Room code", "Quiz", "Participants", "Winner", "Status", "Created"]} rows={(data.rooms as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "analytics" ? <SectionCard title="Enterprise analytics"><MiniMetricGrid rows={Object.entries((data.analytics as AnyRow) ?? {}).map(([label, value]) => ({ label, value }))} /></SectionCard> : null}
        {activeTab === "plan" ? <SectionCard title="Plan & Limits"><p className="text-sm font-bold text-slate-700">Current plan: {String(((data.subscription as AnyRow)?.plan as AnyRow)?.name ?? "No subscription")}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.isArray(enterprise.usage) ? enterprise.usage.map((item) => <UsageProgressCard key={String((item as AnyRow).label)} usage={item as never} />) : null}</div></SectionCard> : null}
        {activeTab === "payments" ? <SectionCard title="Payments"><DataTable columns={["Enterprise", "Payer name", "Transaction ID", "Amount", "Status"]} rows={((data.payments as AnyRow)?.rows as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "domains" ? <SectionCard title="Domains & Website"><DataTable columns={["Enterprise", "Domain", "DNS", "SSL", "Website"]} rows={((data.domains as AnyRow)?.rows as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "support" ? <SectionCard title="Support"><DataTable columns={["Subject", "Enterprise", "Priority", "Status", "Created"]} rows={((data.support as AnyRow)?.rows as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "audit" ? <SectionCard title="Audit Logs"><DataTable columns={["Actor", "Action", "Target", "Old value", "New value", "Timestamp"]} rows={(data.auditLogs as AnyRow[]) ?? []} /></SectionCard> : null}
        {activeTab === "settings" ? <SectionCard title="Enterprise settings"><p className="text-sm text-slate-600">Primary contact: {String((data.settings as AnyRow)?.primaryContactName ?? "-")} · {String((data.settings as AnyRow)?.primaryContactEmail ?? "-")}</p></SectionCard> : null}
      </div>
    </>
  );
}

function enterpriseTabKey(label: string) {
  const map: Record<string, string> = { "Overview": "overview", "Admins & Hosts": "people", "Students": "students", "Quizzes": "quizzes", "Live Rooms": "rooms", "Analytics": "analytics", "Plan & Limits": "plan", "Payments": "payments", "Domains & Website": "domains", "Support": "support", "Audit Logs": "audit", "Settings": "settings" };
  return map[label] ?? "overview";
}

function prepareRows(section: string, rows: AnyRow[]): AnyRow[] {
  if (section === "enterprises") return prepareEnterpriseRows(rows);
  if (section === "payments" || section === "upgrade-requests") return rows.map((row) => ({ ...row, detailHref: `/super-admin/enterprises/${row.id}` }));
  if (section === "rooms") return rows.map((row) => ({ ...row, detailHref: row.roomCode ? `/leaderboard/${row.roomCode}` : undefined }));
  if (section === "domains") return rows.map((row) => ({ ...row, resourceSection: "domains", resourceAction: "verify", resourceLabel: "Verify" }));
  if (section === "support") return rows.map((row) => ({ ...row, resourceSection: "support", resourceAction: "resolve", resourceLabel: "Resolve" }));
  return rows;
}

function CollectionToolbar({ section, data, placeholder }: { section: string; data: Record<string, unknown>; placeholder?: string }) {
  return <SearchFilterBar placeholder={placeholder} filters={(data.filters as AnyRow) ?? {}} plans={(data.plans as string[]) ?? []} showPlan={section === "enterprises"} />;
}

function CollectionPager({ section, data }: { section: string; data: Record<string, unknown> }) {
  return <PaginationControls pagination={data.pagination as SuperAdminPagination | undefined} basePath={`/super-admin/${section}`} filters={(data.filters as AnyRow) ?? {}} />;
}

function organizationOptions(data: Record<string, unknown>) {
  return ((data.organizations as AnyRow[]) ?? []).map((organization) => ({ value: String(organization.id), label: String(organization.name) }));
}

function prepareEnterpriseRows(rows: AnyRow[]) {
  return rows.map((row) => ({ ...row, detailHref: `/super-admin/enterprises/${row.id}` }));
}

function MiniMetricGrid({ rows }: { rows: AnyRow[] }) {
  if (!rows.length) return <EmptyState title="No AI usage yet" text="Usage appears after hosts generate questions." />;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{rows.map((row) => <div key={String(row.label)} className="rounded bg-slate-50 p-4"><p className="text-sm font-black text-slate-700">{String(row.label)}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{String(row.value)}</p></div>)}</div>;
}

function UpgradeRequestCard({ row }: { row: AnyRow }) {
  return (
    <SectionCard title={String(row.enterprise)}>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-2 text-sm font-semibold text-slate-600">
          <p>Requested plan: <span className="font-black text-slate-950">{String(row.requestedPlan ?? "-")}</span></p>
          <p>Status: <StatusBadge value={row.status} /></p>
          <p>Requested: {String(row.createdAt ?? "-")}</p>
          {row.adminNote ? <p>Admin note: {String(row.adminNote)}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <SuperAdminActionButton section="upgrade-requests" itemId={String(row.id)} action="approve" label="Approve" tone="primary" />
          <SuperAdminActionButton section="upgrade-requests" itemId={String(row.id)} action="reject" label="Reject" tone="danger" />
          <SuperAdminActionButton section="upgrade-requests" itemId={String(row.id)} action="contact" label="Contact" />
        </div>
      </div>
    </SectionCard>
  );
}

function PaymentVerificationCard({ row }: { row: AnyRow }) {
  return (
    <SectionCard title={String(row.enterprise)}>
      <div className="grid gap-3 text-sm font-semibold text-slate-600">
        <p>Payer: <span className="font-black text-slate-950">{String(row.payerName ?? "-")}</span></p>
        <p>Transaction ID: <span className="font-mono text-xs font-black text-slate-950">{String(row.transactionId ?? "-")}</span></p>
        <p>Amount: <span className="font-black text-slate-950">{String(row.amount ?? "-")}</span></p>
        <p>Status: <StatusBadge value={row.status} /></p>
        {row.adminNote ? <p>Admin note: {String(row.adminNote)}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <SuperAdminActionButton section="payments" itemId={String(row.id)} action="verify" label="Verify payment" tone="primary" />
          <SuperAdminActionButton section="payments" itemId={String(row.id)} action="reject" label="Reject" tone="danger" />
          <SuperAdminActionButton section="payments" itemId={String(row.id)} action="contact" label="More info" />
        </div>
      </div>
    </SectionCard>
  );
}
