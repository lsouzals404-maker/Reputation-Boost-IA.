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
} from "./http.js";
import { ensureStore, readState } from "./store.js";
import { getAgencyData } from "./services/agency-service.js";
import {
  getUserById,
  getWorkspaceByUserId,
  loginUser,
  registerUser,
} from "./services/auth-service.js";
import { getSubscriptionData } from "./services/billing-service.js";
import { getDashboardData } from "./services/dashboard-service.js";
import { handleGoogleOAuthCallback } from "./services/google-service.js";
import { getReviews } from "./services/reviews-service.js";
import {
  createSession,
  destroySession,
  getSession,
} from "./services/session-manager.js";
import { getSettings } from "./services/settings-service.js";
import { validateTransfer } from "./services/asaas-service.js";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

async function buildBootstrapPayload(userId) {
  const [
    user,
    workspace,
    dashboard,
    reviews,
    settings,
    agency,
    subscription,
  ] = await Promise.all([
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
      appUrl: config.appUrl,
    },
  };
}

async function serveIndex(res) {
  const filePath = path.join(config.publicDir, "index.html");
  const content = await fs.readFile(filePath);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });
  res.end(content);
}

function requireAuth(req, res) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Sessão expirada" });
    return null;
  }
  return userId;
}

async function handleApiRequest(req, res, url) {
  // 🔥 GOOGLE OAUTH START
  if (req.method === "GET" && url.pathname === "/api/auth/google") {
    if (!isGoogleConfigured()) {
      sendJson(res, 500, { error: "Google não configurado" });
      return;
    }

    const state = createSignedState({ ts: Date.now() });

    const authUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );

    authUrl.searchParams.set("client_id", config.googleClientId);
    authUrl.searchParams.set("redirect_uri", config.googleRedirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", config.googleScopes.join(" "));
    authUrl.searchParams.set("state", state);

    redirect(res, authUrl.toString());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const payload = await readJsonBody(req);
    const user = await loginUser(payload);
    makeSessionCookie(res, user.id);
    sendJson(res, 200, { user });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const payload = await readJsonBody(req);
    const user = await registerUser(payload);
    makeSessionCookie(res, user.id);
    sendJson(res, 201, { user });
    return;
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    sendJson(res, 200, await buildBootstrapPayload(userId));
    return;
  }

  sendJson(res, 404, { error: "Rota não encontrada" });
}

async function requestListener(req, res) {
  const url = new URL(req.url, config.appUrl);

  try {
    // 🔥 CALLBACK GOOGLE (CORRETO)
    if (url.pathname === "/oauth/google/callback") {
      const { code, state } = Object.fromEntries(url.searchParams);

      if (!code || !state) {
        sendText(res, 400, "Missing code/state");
        return;
      }

      const userId = await handleGoogleOAuthCallback(code, state);

      makeSessionCookie(res, userId);

      redirect(res, "/dashboard");
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest(req, res, url);
      return;
    }

    await serveIndex(res);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Erro interno" });
  }
}

await ensureStore();
await readState();

const server = http.createServer(requestListener);

server.listen(config.port, () => {
  console.log(`Rodando em ${config.appUrl}`);
});