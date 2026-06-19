import { FolderPlus, Upload } from "lucide-react";
import { OrganizationShell } from "@/components/layout/product-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, Tabs } from "@/components/ui/product";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type WorkspaceData = { templates: Array<Array<string | number>> };

export default async function DepartmentWorkspacePage() {
  const { data, error } = await getApi<WorkspaceData>("/api/admin/workspace");
  return (
    <OrganizationShell title="Department Collaborative Workspace" subtitle="Shared library" action={<Button><FolderPlus size={16} />Create folder</Button>}>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="rounded-2xl bg-brand-600 p-6 text-white shadow-lifted">
        <h2 className="text-3xl font-black">Faculty-shared quiz templates</h2>
        <p className="mt-2 max-w-2xl text-brand-100">Departments can organize approved practice sets, reusable question banks, and live-room templates.</p>
      </div>
      <Card className="mt-6">
        <CardBody>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Tabs items={["Templates", "Folders", "Contributors"]} />
            <Button variant="secondary"><Upload size={16} />Upload</Button>
          </div>
          <DataTable columns={["Department", "Template", "Size", "Updated"]} rows={data?.templates ?? []} />
        </CardBody>
      </Card>
    </OrganizationShell>
  );
}
