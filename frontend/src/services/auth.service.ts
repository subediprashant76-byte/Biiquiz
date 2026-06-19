import { db } from "@/lib/db";
import { hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "@/schemas/auth.schema";

export async function registerHost(input: z.infer<typeof registerSchema>) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("An account already exists for this email.");
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      role: "host"
    },
    select: { id: true, name: true, email: true, role: true, organizationId: true }
  });
  await setSessionCookie(user.id);
  return user;
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive) throw new Error("Invalid email or password.");
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password.");
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie(user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
  };
}

