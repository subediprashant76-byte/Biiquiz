import { z } from "zod";

export const hostPassCreateSchema = z.object({
  passCode: z.string().trim().min(6).max(80),
  planName: z.string().trim().min(2).max(80),
  participantLimit: z.coerce.number().int().min(51).max(5000),
  validUntil: z.coerce.date(),
  assignedHostId: z.string().uuid().optional().nullable(),
  assignedOrganizationId: z.string().uuid().optional().nullable(),
  isActive: z.coerce.boolean().default(true)
});

