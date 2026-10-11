import { createHmac, timingSafeEqual } from "node:crypto";

export interface VolunteerSession {
  id: string;
  code: string;
  name: string;
  expiresAt: number;
}

const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function getSessionSecret(): string {
  const secret = process.env.VOLUNTEER_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Volunteer session secret is not configured");
  }

  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export function createVolunteerSession(
  identity: Omit<VolunteerSession, "expiresAt">
): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...identity,
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyVolunteerSession(
  token: string | undefined
): VolunteerSession | null {
  if (!token) return null;

  try {
    const [payload, signature, extra] = token.split(".");

    if (!payload || !signature || extra !== undefined) return null;

    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as VolunteerSession;

    if (
      typeof session.id !== "string" ||
      typeof session.code !== "string" ||
      typeof session.name !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export { SESSION_DURATION_SECONDS };