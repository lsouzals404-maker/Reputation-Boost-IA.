import fs from "node:fs";
import fsp from "node:fs/promises";

import { config } from "./config.js";
import { buildInitialState } from "./sample-data.js";

let mutationQueue = Promise.resolve();

export async function ensureStore() {
  await fsp.mkdir(config.dataDir, { recursive: true });
  if (!fs.existsSync(config.storagePath)) {
    await fsp.writeFile(config.storagePath, JSON.stringify(buildInitialState(), null, 2), "utf8");
  }
}

export async function readState() {
  await ensureStore();
  const raw = await fsp.readFile(config.storagePath, "utf8");
  return JSON.parse(raw);
}

export async function mutateState(mutator) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    const state = await readState();
    const result = await mutator(state);
    await fsp.writeFile(config.storagePath, JSON.stringify(state, null, 2), "utf8");
    return result;
  });
  return mutationQueue;
}

export function generateId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

