import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";
import { OrganizationShell, WorkspaceShell } from "@/components/layout/product-shell";
import { SuperAdminLayout } from "@/components/super-admin/super-admin-shell";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type User = {
  id: string;
  name: string;
  email: string;
  role: "host" | "admin";
  organizationId: string | null;
};

export default async function ProfilePage() {
  const { data } = await getApi<User>("/api/auth/profile");
  if (!data) redirect("/login");
  const title = "Profile";
  const subtitle = data.role === "admin" && data.organizationId ? "Organization admin" : data.role === "admin" ? "Super Admin" : "Host";
  const content = <ProfileForm user={data} />;
  if (data.role === "admin" && !data.organizationId) {
    return <SuperAdminLayout>{content}</SuperAdminLayout>;
  }
  if (data.role === "admin") {
    return <OrganizationShell title={title} subtitle={subtitle}>{content}</OrganizationShell>;
  }
  return <WorkspaceShell mode="host" title={title} subtitle={subtitle}>{content}</WorkspaceShell>;
}
