import crypto from "node:crypto";

const sessions = new Map();
const oneWeekInSeconds = 60 * 60 * 24 * 7;

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + oneWeekInSeconds * 1000,
  });
  return { token, maxAge: oneWeekInSeconds };
}

export function getSession(token) {
  if (!token) {
    return null;
  }
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token) {
  if (token) {
    sessions.delete(token);
  }
}

