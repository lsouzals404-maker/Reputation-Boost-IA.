import { generateId, mutateState, readState } from "../store.js";

export async function getAgencyData(userId) {
  const state = await readState();
  return state.workspaces[userId]?.agency ?? null;
}

export async function addAgencyClient(userId, payload) {
  return mutateState((state) => {
    const workspace = state.workspaces[userId];
    if (!workspace) {
      const error = new Error("Workspace nao encontrado.");
      error.statusCode = 404;
      throw error;
    }

    const businessName = String(payload.businessName || "").trim();
    if (!businessName) {
      const error = new Error("Informe o nome do negocio.");
      error.statusCode = 400;
      throw error;
    }

    const client = {
      id: generateId("client"),
      businessName,
      status: payload.status || "Onboarding",
      averageRating: Number(payload.averageRating || 0) || 0,
      locations: Number(payload.locations || 1) || 1,
      autopilotEnabled: Boolean(payload.autopilotEnabled),
    };

    workspace.agency.clients.unshift(client);
    return client;
  });
}

