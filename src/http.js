import crypto from "node:crypto";

const cookieOptionsDefault = {
  httpOnly: true,
  sameSite: "Lax",
  path: "/",
};

export async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Corpo da requisicao invalido.");
    error.statusCode = 400;
    throw error;
  }
}

export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

export function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(text);
}

export function redirect(res, location, statusCode = 302) {
  res.writeHead(statusCode, { Location: location });
  res.end();
}

export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const [key, ...rest] = part.split("=");
      accumulator[key] = decodeURIComponent(rest.join("="));
      return accumulator;
    }, {});
}

export function setCookie(res, name, value, options = {}) {
  const settings = { ...cookieOptionsDefault, ...options };
  const pieces = [`${name}=${encodeURIComponent(value)}`];
  if (settings.maxAge) {
    pieces.push(`Max-Age=${settings.maxAge}`);
  }
  if (settings.httpOnly) {
    pieces.push("HttpOnly");
  }
  if (settings.sameSite) {
    pieces.push(`SameSite=${settings.sameSite}`);
  }
  if (settings.path) {
    pieces.push(`Path=${settings.path}`);
  }
  if (settings.secure) {
    pieces.push("Secure");
  }
  res.setHeader("Set-Cookie", pieces.join("; "));
}

export function clearCookie(res, name) {
  res.setHeader("Set-Cookie", `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

export function createSignedState(secret, payload) {
  const serialized = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(serialized).digest("hex");
  return Buffer.from(JSON.stringify({ payload, signature }), "utf8").toString("base64url");
}

export function verifySignedState(secret, encoded) {
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const expectedSignature = crypto.createHmac("sha256", secret).update(JSON.stringify(decoded.payload)).digest("hex");
    if (decoded.signature !== expectedSignature) {
      return null;
    }
    return decoded.payload;
  } catch {
    return null;
  }
}

