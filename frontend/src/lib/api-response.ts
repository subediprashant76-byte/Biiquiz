import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(code: ApiErrorCode, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function validationFail(message = "Invalid request.") {
  return fail("BAD_REQUEST", message, 422);
}

