import crypto from "node:crypto";

import { createWorkspaceSeed } from "../sample-data.js";
import { generateId, mutateState, readState } from "../store.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) {
    return false;
  }
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!name || !normalizedEmail || !password) {
    const error = new Error("Preencha nome, e-mail e senha.");
    error.statusCode = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error("A senha deve ter pelo menos 8 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  return mutateState((state) => {
    const exists = state.users.some((candidate) => candidate.email === normalizedEmail);
    if (exists) {
      const error = new Error("Ja existe uma conta com este e-mail.");
      error.statusCode = 409;
      throw error;
    }

    const user = {
      id: generateId("user"),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    state.users.push(user);
    state.workspaces[user.id] = createWorkspaceSeed(user.name, user.email);
    return sanitizeUser(user);
  });
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const state = await readState();
  const user = state.users.find((candidate) => candidate.email === normalizedEmail);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    const error = new Error("E-mail ou senha invalidos.");
    error.statusCode = 401;
    throw error;
  }
  return sanitizeUser(user);
}

export async function findOrCreateUserFromGoogle({ name, email }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error("O Google nao retornou um e-mail valido.");
    error.statusCode = 400;
    throw error;
  }

  return mutateState((state) => {
    const existingUser = state.users.find((candidate) => candidate.email === normalizedEmail);
    if (existingUser) {
      if (!existingUser.name && name) {
        existingUser.name = name;
      }
      return sanitizeUser(existingUser);
    }

    const user = {
      id: generateId("user"),
      name: String(name || normalizedEmail.split("@")[0]).trim(),
      email: normalizedEmail,
      passwordHash: "",
      createdAt: new Date().toISOString(),
      authProvider: "google",
    };

    state.users.push(user);
    state.workspaces[user.id] = createWorkspaceSeed(user.name, user.email);
    return sanitizeUser(user);
  });
}

export async function getUserById(userId) {
  const state = await readState();
  const user = state.users.find((candidate) => candidate.id === userId);
  return user ? sanitizeUser(user) : null;
}

export async function getWorkspaceByUserId(userId) {
  const state = await readState();
  return state.workspaces[userId] ?? null;
}

export async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  const state = await readState();
  const user = state.users.find((candidate) => candidate.email === normalizedEmail);
  return {
    delivered: Boolean(user),
    message:
      "Para o MVP, o fluxo de recuperacao apenas confirma a solicitacao. Em producao, conecte aqui o provedor de e-mail transacional.",
  };
}
