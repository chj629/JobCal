import "server-only";

import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  createPasswordRecoveryGrant,
  PASSWORD_RECOVERY_GRANT_MAX_AGE_SECONDS,
  verifyPasswordRecoveryGrant,
} from "./passwordRecoveryGrantToken";

export const PASSWORD_RECOVERY_GRANT_COOKIE = "jobcal-password-recovery";

function getGrantSecret() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceRoleKey ? `jobcal:password-recovery:${serviceRoleKey}` : null;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setPasswordRecoveryGrant(
  response: NextResponse,
  input: {
    userId: string;
    sessionId: string;
    userUpdatedAt: string;
    sessionExpiresAt: number;
  }
) {
  const secret = getGrantSecret();
  if (!secret) return false;
  const token = createPasswordRecoveryGrant(input, secret);
  if (!token) return false;
  const maxAge = Math.min(
    PASSWORD_RECOVERY_GRANT_MAX_AGE_SECONDS,
    input.sessionExpiresAt - Math.floor(Date.now() / 1000)
  );
  if (maxAge <= 0) return false;

  response.cookies.set(
    PASSWORD_RECOVERY_GRANT_COOKIE,
    token,
    cookieOptions(maxAge)
  );
  return true;
}

export function clearPasswordRecoveryGrant(response: NextResponse) {
  response.cookies.set(PASSWORD_RECOVERY_GRANT_COOKIE, "", cookieOptions(0));
}

export async function validatePasswordRecoveryGrant() {
  const secret = getGrantSecret();
  if (!secret) return { valid: false as const, supabase: null };

  const cookieStore = await cookies();
  const token = cookieStore.get(PASSWORD_RECOVERY_GRANT_COOKIE)?.value;
  if (!token) return { valid: false as const, supabase: null };

  const supabase = await createClient();
  const userResult = await supabase.auth.getUser();
  const claimsResult = await supabase.auth.getClaims();
  const user = userResult.data.user;
  const claims = claimsResult.data?.claims;
  if (
    userResult.error ||
    claimsResult.error ||
    !user ||
    !user.updated_at ||
    !claims ||
    claims.sub !== user.id
  ) {
    return { valid: false as const, supabase: null };
  }

  const valid = verifyPasswordRecoveryGrant(
    token,
    {
      userId: user.id,
      sessionId: claims.session_id,
      userUpdatedAt: user.updated_at,
    },
    secret
  );
  return valid
    ? { valid: true as const, supabase }
    : { valid: false as const, supabase: null };
}
