import { NextResponse } from "next/server";
import {
  clearPasswordRecoveryGrant,
  validatePasswordRecoveryGrant,
} from "@/lib/auth/passwordRecoveryGrant";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "invalid_request" }, { status: 403 });
  }

  const recovery = await validatePasswordRecoveryGrant();
  if (!recovery.valid) {
    const response = NextResponse.json({ error: "invalid_recovery" }, { status: 403 });
    clearPasswordRecoveryGrant(response);
    return response;
  }

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }

  const { error } = await recovery.supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  clearPasswordRecoveryGrant(response);
  return response;
}
