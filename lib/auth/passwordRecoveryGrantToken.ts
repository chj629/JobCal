import { createHmac, timingSafeEqual } from "node:crypto";

export const PASSWORD_RECOVERY_GRANT_MAX_AGE_SECONDS = 30 * 60;

type PasswordRecoveryGrantPayload = {
  version: 1;
  userId: string;
  sessionId: string;
  userUpdatedAt: string;
  issuedAt: number;
  expiresAt: number;
};

type PasswordRecoveryGrantContext = Pick<
  PasswordRecoveryGrantPayload,
  "userId" | "sessionId" | "userUpdatedAt"
>;

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createPasswordRecoveryGrant(
  context: PasswordRecoveryGrantContext & { sessionExpiresAt: number },
  secret: string,
  now = Math.floor(Date.now() / 1000)
) {
  const expiresAt = Math.min(
    context.sessionExpiresAt,
    now + PASSWORD_RECOVERY_GRANT_MAX_AGE_SECONDS
  );
  if (!secret || expiresAt <= now) return null;

  const payload: PasswordRecoveryGrantPayload = {
    version: 1,
    userId: context.userId,
    sessionId: context.sessionId,
    userUpdatedAt: context.userUpdatedAt,
    issuedAt: now,
    expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyPasswordRecoveryGrant(
  token: string | undefined,
  expected: PasswordRecoveryGrantContext,
  secret: string,
  now = Math.floor(Date.now() / 1000)
) {
  if (!token || !secret) return false;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return false;

  const actualSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = Buffer.from(sign(encodedPayload, secret), "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<PasswordRecoveryGrantPayload>;
    return (
      payload.version === 1 &&
      payload.userId === expected.userId &&
      payload.sessionId === expected.sessionId &&
      payload.userUpdatedAt === expected.userUpdatedAt &&
      typeof payload.issuedAt === "number" &&
      typeof payload.expiresAt === "number" &&
      payload.issuedAt <= now + 60 &&
      payload.expiresAt > now &&
      payload.expiresAt - payload.issuedAt <= PASSWORD_RECOVERY_GRANT_MAX_AGE_SECONDS
    );
  } catch {
    return false;
  }
}
