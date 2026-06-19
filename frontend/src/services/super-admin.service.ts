import { z } from "zod";

export const superAdminRowSchema = z.record(z.unknown());

export const superAdminPaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive()
});

export const superAdminPayloadSchema = z.object({
  rows: z.array(superAdminRowSchema).optional(),
  stats: z.array(superAdminRowSchema).optional(),
  pagination: superAdminPaginationSchema.optional(),
  filters: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    plan: z.string().optional(),
    includeSamples: z.boolean().optional()
  }).optional()
}).passthrough();

export type SuperAdminRow = z.infer<typeof superAdminRowSchema>;
export type SuperAdminPagination = z.infer<typeof superAdminPaginationSchema>;
export type SuperAdminPayload = z.infer<typeof superAdminPayloadSchema>;

export function parseSuperAdminPayload(value: unknown): SuperAdminPayload {
  return superAdminPayloadSchema.parse(value);
}
