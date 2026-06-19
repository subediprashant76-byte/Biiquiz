import { redirect } from "next/navigation";
import { getApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type CurrentUser = {
  role: "host" | "admin";
  organizationId: string | null;
};

export default async function SuperAdminRouteLayout({ children }: { children: React.ReactNode }) {
  const { data } = await getApi<CurrentUser>("/api/auth/me");

  if (!data) redirect("/login");
  if (data.role !== "admin") redirect("/dashboard");
  if (data.organizationId) redirect("/admin");

  return children;
}
