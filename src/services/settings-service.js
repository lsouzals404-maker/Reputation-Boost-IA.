import { mutateState, readState } from "../store.js";

export async function getSettings(userId) {
  const state = await readState();
  return state.workspaces[userId]?.settings ?? null;
}

export async function updateSettings(userId, payload) {
  return mutateState((state) => {
    const workspace = state.workspaces[userId];
    if (!workspace) {
      const error = new Error("Workspace nao encontrado.");
      error.statusCode = 404;
      throw error;
    }

    const nextKeywords = Array.isArray(payload.seoKeywords)
      ? payload.seoKeywords.filter(Boolean).map((keyword) => String(keyword).trim()).slice(0, 12)
      : workspace.settings.seoKeywords;

    workspace.settings = {
      ...workspace.settings,
      autoPilotEnabled: Boolean(payload.autoPilotEnabled),
      tone: payload.tone || workspace.settings.tone,
      customInstructions: String(payload.customInstructions ?? workspace.settings.customInstructions).slice(0, 500),
      seoKeywords: nextKeywords,
    };

    return workspace.settings;
  });
}

