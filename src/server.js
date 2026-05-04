import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { config, isGoogleConfigured, isOpenAiConfigured } from "./config.js";
import {
  clearCookie,
  createSignedState,
  parseCookies,
  readJsonBody,
  redirect,
  sendJson,
  sendText,
  setCookie,
  verifySignedState,
} from "./http.js";
import { ensureStore, readState } from "./store.js";
import { addAgencyClient, getAgencyData } from "./services/agency-service.js";
import { findOrCreateUserFromGoogle, getUserById, getWorkspaceByUserId, loginUser, registerUser, requestPasswordReset } from "./services/auth-service.js";
import { cancelSubscription, createBillingPortalSession, getSubscriptionData } from "./services/billing-service.js";
import { getDashboardData } from "./services/dashboard-service.js";
import { completeDemoGoogleConnection, handleGoogleOAuthCallback, saveSelectedLocations, startGoogleConnection } from "./services/google-service.js";
import { discardReviewReply, generateReplyForReview, getReviewById, getReviews, publishReviewReply, saveReviewDraft } from "./services/reviews-service.js";
import { createSession, destroySession, getSession } from "./services/session-manager.js";
import { getSettings, updateSettings } from "./services/settings-service.js";

// ✅ IMPORT DO ASAAS
import { validateTransfer } from "./services/asaas-service.js";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function getAuthenticatedUserId(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const session = getSession(cookies.rb_session);
  return session?.userId ?? null;
}

function makeSessionCookie(res, userId) {
  const session = createSession(userId);
  setCookie(res, "rb_session", session.token, { maxAge: session.maxAge });
}

function clearSessionCookie(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  destroySession(cookies.rb_session);
  clearCookie(res, "rb_session");
}

async function buildBootstrapPayload(userId) {
  const [user, workspace, dashboard, reviews, settings, agency, subscription] = await Promise.all([
    getUserById(userId),
    getWorkspaceByUserId(userId),
    getDashboardData(userId),
    getReviews(userId, { sort: "newest" }),
    getSettings(userId),
    getAgencyData(userId),
    getSubscriptionData(userId),
  ]);

  return {
    user,
    dashboard,
    reviews,
    settings,
    agency,
    subscription,
    googleConnection: workspace?.googleConnection ?? null,
    integrations: {
      openAiConfigured: isOpenAiConfigured(),
      googleConfigured: isGoogleConfigured(),
      billingProvider: subscription?.provider || config.billingProvider,
      appUrl: config.appUrl,
    },
  };
}

async function serveIndex(res) {
  const filePath = path.join(config.publicDir, "index.html");
  const content = await fs.readFile(filePath);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(content);
}

async function serveStaticFile(res, pathname) {
  const sanitizedPath = path.normalize(pathname.replace(/^\/+/, "")).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(config.publicDir, sanitizedPath);
  if (!filePath.startsWith(config.publicDir)) {
    sendText(res, 403, "Acesso negado.");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  } catch {
    await serveIndex(res);
  }
}

function requireAuth(req, res) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Sessao expirada. Entre novamente." });
    return null;
  }
  return userId;
}

async function handleApiRequest(req, res, url) {

  // ✅ WEBHOOK ASAAS (ANTES DE QUALQUER AUTH)
  if (req.method === "POST" && url.pathname === "/api/asaas/validate-transfer") {
    const asaasToken = req.headers["asaas-access-token"];
    const secretToken = "Nicolas e Emili";

    if (asaasToken !== secretToken) {
      sendJson(res, 401, { error: "Não autorizado" });
      return;
    }

    const payload = await readJsonBody(req);

    console.log("[ASAAS WEBHOOK RECEBIDO]");
    console.log(payload);

    const result = validateTransfer(payload);

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      googleConfigured: isGoogleConfigured(),
      openAiConfigured: isOpenAiConfigured(),
      billingProvider: config.billingProvider,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const payload = await readJsonBody(req);
    const user = await registerUser(payload);
    makeSessionCookie(res, user.id);
    sendJson(res, 201, { user });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const payload = await readJsonBody(req);
    const user = await loginUser(payload);
    makeSessionCookie(res, user.id);
    sendJson(res, 200, { user });
    return;
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    sendJson(res, 200, await buildBootstrapPayload(userId));
    return;
  }

  sendJson(res, 404, { error: "Rota nao encontrada." });
}

function handleError(res, error) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Erro interno do servidor.";
  sendJson(res, statusCode, { error: message });
}

async function requestListener(req, res) {
  const url = new URL(req.url, config.appUrl);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest(req, res, url);
      return;
    }

    if (url.pathname === "/" || !path.extname(url.pathname)) {
      await serveIndex(res);
      return;
    }

    await serveStaticFile(res, url.pathname);
  } catch (error) {
    console.error("[server]", error);
    handleError(res, error);
  }
}

await ensureStore();
await readState();

const server = http.createServer(requestListener);
server.listen(config.port, () => {
  console.log(`Servidor rodando em ${config.appUrl}`);
});