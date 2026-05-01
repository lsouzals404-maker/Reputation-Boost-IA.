import fs from "node:fs";
import path from "node:path";

function parseEnv(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }
  return env;
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }
  return parseEnv(fs.readFileSync(envPath, "utf8"));
}

const fileEnv = loadEnvFile();
const readEnv = (key, fallback = "") => process.env[key] ?? fileEnv[key] ?? fallback;
const port = Number.parseInt(readEnv("PORT", "3000"), 10);

export const config = {
  rootDir: process.cwd(),
  publicDir: path.join(process.cwd(), "public"),
  dataDir: path.join(process.cwd(), "data"),
  storagePath: path.join(process.cwd(), "data", "app-state.json"),
  port: Number.isFinite(port) ? port : 3000,
  appUrl: readEnv("APP_URL", `http://localhost:${port || 3000}`),
  sessionSecret: readEnv("SESSION_SECRET", "reputation-boost-ia-dev-secret"),
  openAiApiKey: readEnv("OPENAI_API_KEY"),
  openAiModel: readEnv("OPENAI_MODEL", "gpt-4o-mini"),
  googleClientId: readEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: readEnv("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: readEnv("GOOGLE_REDIRECT_URI", `http://localhost:${port || 3000}/oauth/google/callback`),
  googleScopes: readEnv(
    "GOOGLE_OAUTH_SCOPES",
    "openid email profile https://www.googleapis.com/auth/business.manage",
  )
    .split(/\s+/)
    .filter(Boolean),
  billingProvider: readEnv("BILLING_PROVIDER", "stripe").toLowerCase(),
  stripeSecretKey: readEnv("STRIPE_SECRET_KEY"),
  stripeReturnUrl: readEnv("STRIPE_RETURN_URL", `${readEnv("APP_URL", `http://localhost:${port || 3000}`)}/#billing`),
  asaasApiKey: readEnv("ASAAS_API_KEY"),
  asaasBaseUrl: readEnv("ASAAS_BASE_URL", "https://api-sandbox.asaas.com"),
};

export function isOpenAiConfigured() {
  return Boolean(config.openAiApiKey);
}

export function isGoogleConfigured() {
  return Boolean(config.googleClientId && config.googleClientSecret && config.googleRedirectUri);
}

export function isStripeConfigured() {
  return Boolean(config.stripeSecretKey);
}

export function isAsaasConfigured() {
  return Boolean(config.asaasApiKey);
}

