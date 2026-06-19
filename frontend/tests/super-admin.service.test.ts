import { describe, expect, it } from "vitest";
import { parseSuperAdminPayload } from "../src/services/super-admin.service";

describe("Super Admin API contract", () => {
  it("accepts real paginated collection responses", () => {
    const result = parseSuperAdminPayload({
      rows: [{ id: "org-1", name: "Acme" }],
      stats: [{ label: "Total", value: 1 }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      filters: { search: "", status: "", plan: "", includeSamples: false }
    });
    expect(result.pagination?.total).toBe(1);
    expect(result.rows?.[0].name).toBe("Acme");
  });

  it("rejects malformed pagination instead of silently showing mock data", () => {
    expect(() => parseSuperAdminPayload({ rows: [], pagination: { page: 0 } })).toThrow();
  });
});
