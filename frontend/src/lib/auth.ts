import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const SESSION_COOKIE = "biiquiz_session";
const PARTICIPANT_COOKIE = "biiquiz_participant";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "host";
  organizationId: string | null;
};

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createRandomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(token).digest("hex");
}

export function signSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", env.AUTH_SECRET).update(body).digest("base64url");
  const safe = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!safe) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  if (payload.expiresAt < Date.now()) return null;
  return payload;
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  const token = signSession({
    userId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14
  });
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, organizationId: true, isActive: true }
  });
  if (!user?.isActive) return null;
  return user;
}

export async function requireHost() {
  const user = await getSessionUser();
  if (!user) throw new Error("Authentication required.");
  if (user.role !== "host" && user.role !== "admin") throw new Error("Host access required.");
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new Error("Admin access required.");
  return user;
}

export async function setParticipantCookie(roomCode: string, token: string) {
  const jar = await cookies();
  jar.set(`${PARTICIPANT_COOKIE}_${roomCode}`, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function getParticipantToken(roomCode: string) {
  const jar = await cookies();
  return jar.get(`${PARTICIPANT_COOKIE}_${roomCode}`)?.value ?? null;
}

