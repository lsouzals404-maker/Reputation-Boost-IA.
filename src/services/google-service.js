import crypto from "node:crypto";

import { config, isGoogleConfigured } from "../config.js";
import { createSignedState, verifySignedState } from "../http.js";
import { mutateState, readState } from "../store.js";

function getWorkspace(state, userId) {
  const workspace = state.workspaces[userId];
  if (!workspace) {
    const error = new Error("Workspace nao encontrado.");
    error.statusCode = 404;
    throw error;
  }
  return workspace;
}

function buildGoogleAuthUrl(stateToken) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.googleClientId);
  url.searchParams.set("redirect_uri", config.googleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.googleScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", stateToken);
  return url.toString();
}

async function fetchGoogleToken(code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao trocar o codigo OAuth (${response.status}).`);
  }
  return response.json();
}

async function refreshGoogleToken(refreshToken) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao renovar token Google (${response.status}).`);
  }
  return response.json();
}

async function googleApiRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Google API returned ${response.status}`);
  }
  return response.json();
}

async function listAccounts(accessToken) {
  const payload = await googleApiRequest("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", accessToken);
  return payload.accounts || [];
}

async function listLocationsForAccount(accountName, accessToken) {
  const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`);
  url.searchParams.set("readMask", "name,title,storefrontAddress");
  const payload = await googleApiRequest(url.toString(), accessToken);
  return payload.locations || [];
}

function mapLocation(accountName, location) {
  const address = location.storefrontAddress
    ? [
        ...(location.storefrontAddress.addressLines || []),
        location.storefrontAddress.locality,
        location.storefrontAddress.administrativeArea,
      ]
        .filter(Boolean)
        .join(", ")
    : "Endereco nao informado";

  return {
    id: String(location.name || "").split("/").pop(),
    accountName,
    name: location.name,
    title: location.title || "Localidade sem nome",
    address,
    verified: true,
    reviewCount: 0,
    rating: 0,
  };
}

export async function startGoogleConnection(userId) {
  if (!isGoogleConfigured()) {
    const state = await readState();
    const workspace = getWorkspace(state, userId);
    return {
      mode: "demo",
      authorizationUrl: "",
      availableLocations: workspace.googleConnection.availableLocations,
      message:
        "Credenciais do Google nao configuradas. O MVP entra em modo demo para voce validar o onboarding e a selecao de localidades.",
    };
  }

  return mutateState((state) => {
    const workspace = getWorkspace(state, userId);
    const statePayload = {
      userId,
      nonce: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    const signedState = createSignedState(config.sessionSecret, statePayload);
    workspace.googleConnection.pendingState = signedState;
    return {
      mode: "oauth",
      authorizationUrl: buildGoogleAuthUrl(signedState),
      availableLocations: [],
      message: "Redirecione o usuario para autorizar o acesso ao Google Business Profile.",
    };
  });
}

export async function completeDemoGoogleConnection(userId, selectedLocationIds) {
  return mutateState((state) => {
    const workspace = getWorkspace(state, userId);
    workspace.googleConnection.status = "connected";
    workspace.googleConnection.provider = "demo";
    workspace.googleConnection.connectedAt = new Date().toISOString();
    workspace.googleConnection.selectedLocationIds = selectedLocationIds;
    return workspace.googleConnection;
  });
}

export async function handleGoogleOAuthCallback(code, encodedState) {
  const decodedState = verifySignedState(config.sessionSecret, encodedState);
  if (!decodedState?.userId) {
    throw new Error("State OAuth invalido.");
  }

  const state = await readState();
  const workspace = getWorkspace(state, decodedState.userId);
  if (workspace.googleConnection.pendingState !== encodedState) {
    throw new Error("State OAuth nao corresponde a solicitacao original.");
  }

  const tokenPayload = await fetchGoogleToken(code);
  const accounts = await listAccounts(tokenPayload.access_token);

  const locations = [];
  for (const account of accounts) {
    const accountLocations = await listLocationsForAccount(account.name, tokenPayload.access_token);
    for (const location of accountLocations) {
      locations.push(mapLocation(account.name, location));
    }
  }

  await mutateState((draftState) => {
    const draftWorkspace = getWorkspace(draftState, decodedState.userId);
    draftWorkspace.googleConnection.status = "connected";
    draftWorkspace.googleConnection.provider = "google";
    draftWorkspace.googleConnection.connectedAt = new Date().toISOString();
    draftWorkspace.googleConnection.availableLocations = locations;
    draftWorkspace.googleConnection.selectedLocationIds = locations.slice(0, 1).map((location) => location.id);
    draftWorkspace.googleConnection.accessToken = tokenPayload.access_token;
    draftWorkspace.googleConnection.refreshToken = tokenPayload.refresh_token || draftWorkspace.googleConnection.refreshToken;
    draftWorkspace.googleConnection.tokenExpiry = new Date(Date.now() + (tokenPayload.expires_in || 3600) * 1000).toISOString();
    draftWorkspace.googleConnection.pendingState = "";
  });

  return decodedState.userId;
}

export async function saveSelectedLocations(userId, selectedLocationIds) {
  return mutateState((state) => {
    const workspace = getWorkspace(state, userId);
    workspace.googleConnection.selectedLocationIds = selectedLocationIds;
    workspace.googleConnection.status = "connected";
    workspace.googleConnection.connectedAt = workspace.googleConnection.connectedAt || new Date().toISOString();
    return workspace.googleConnection;
  });
}

async function getFreshAccessToken(connection) {
  if (!connection.refreshToken) {
    return connection.accessToken;
  }
  if (!connection.tokenExpiry || new Date(connection.tokenExpiry).getTime() - Date.now() > 60_000) {
    return connection.accessToken;
  }
  const refreshed = await refreshGoogleToken(connection.refreshToken);
  return refreshed.access_token;
}

export async function publishGoogleReviewReply(userId, review, replyText) {
  const state = await readState();
  const workspace = getWorkspace(state, userId);
  const connection = workspace.googleConnection;

  if (connection.provider !== "google" || !connection.accessToken || !review.googleReviewName) {
    return { publishedRemotely: false };
  }

  const accessToken = await getFreshAccessToken(connection);
  const response = await fetch(`https://mybusiness.googleapis.com/v4/${review.googleReviewName}/reply`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ comment: replyText }),
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel publicar a resposta no Google (${response.status}).`);
  }

  return { publishedRemotely: true };
}
