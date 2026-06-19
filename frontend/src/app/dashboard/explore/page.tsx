import { Search, SlidersHorizontal } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type ExploreQuiz = {
  id: string;
  title: string;
  subject?: string | null;
  _count?: { questions?: number; rooms?: number };
};

export default async function ExploreQuizzesPage() {
  const { data: quizzes, error } = await getApi<ExploreQuiz[]>("/api/quizzes?scope=explore");
  return (
    <WorkspaceShell mode="host" title="Explore Quizzes" subtitle="Template library">
      <div className="rounded-2xl bg-brand-600 p-6 text-white shadow-lifted">
        <p className="text-sm font-black uppercase tracking-wide text-brand-100">Shared library</p>
        <h2 className="mt-2 text-3xl font-black">Copy a proven quiz and adapt it for your room.</h2>
        <p className="mt-2 max-w-2xl text-brand-100">Search by subject, grade, or training program. Public templates can be copied into your workspace.</p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
          <Search size={17} />
          Search quizzes
        </div>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm">
          <SlidersHorizontal size={17} />
          Filters
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[...new Set((quizzes ?? []).map((quiz) => quiz.subject).filter(Boolean))].slice(0, 8).map((item) => <Badge key={item} tone="blue">{item}</Badge>)}
      </div>
      {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(quizzes ?? []).map((quiz) => (
          <Card key={quiz.id}>
            <CardBody>
              <div className="mb-4 h-28 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600" />
              <div className="flex items-center justify-between gap-2">
                <Badge tone="blue">{quiz.subject ?? "General"}</Badge>
                <span className="text-xs font-bold text-slate-500">{quiz._count?.rooms ?? 0} plays</span>
              </div>
              <h3 className="mt-3 min-h-14 text-lg font-black leading-7 text-ink">{quiz.title}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{quiz._count?.questions ?? 0} questions</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <LinkButton href={`/dashboard/quizzes/${quiz.id}/edit`} variant="secondary">Preview</LinkButton>
                <LinkButton href="/dashboard/quizzes/create">Copy</LinkButton>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {!error && !quizzes?.length ? <div className="mt-6"><EmptyState title="No shared quizzes yet" text="Published public and organization quizzes will appear here when available." actionHref="/dashboard/quizzes/create" actionLabel="Create quiz" /></div> : null}
    </WorkspaceShell>
  );
}
