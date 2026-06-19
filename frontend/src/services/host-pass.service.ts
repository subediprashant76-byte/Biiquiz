import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import type { z } from "zod";
import type { hostPassCreateSchema } from "@/schemas/host-pass.schema";

export async function createHostPass(admin: SessionUser, input: z.infer<typeof hostPassCreateSchema>) {
  return db.hostPass.create({
    data: {
      passCodeHash: hashToken(input.passCode),
      planName: input.planName,
      participantLimit: input.participantLimit,
      validUntil: input.validUntil,
      isActive: input.isActive,
      assignedHostId: input.assignedHostId,
      assignedOrganizationId: input.assignedOrganizationId,
      createdByAdminId: admin.id
    }
  });
}

export async function validateHostPass(params: {
  passCode?: string | null;
  hostId: string;
  organizationId: string | null;
  requiredParticipantCount: number;
}) {
  if (!params.passCode) return null;
  const pass = await db.hostPass.findUnique({ where: { passCodeHash: hashToken(params.passCode) } });
  if (!pass || !pass.isActive) return null;
  if (pass.validUntil < new Date()) return null;
  if (pass.participantLimit < params.requiredParticipantCount) return null;
  const assignedToHost = pass.assignedHostId === params.hostId;
  const assignedToOrg = params.organizationId && pass.assignedOrganizationId === params.organizationId;
  const globalPass = !pass.assignedHostId && !pass.assignedOrganizationId;
  return assignedToHost || assignedToOrg || globalPass ? pass : null;
}

export async function listHostPasses() {
  return db.hostPass.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

