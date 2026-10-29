import { jwtVerify } from "jose";

// Parte da sessão que o proxy usa (sem "server-only", sem cookies()).
export const SESSION_COOKIE = "energyza_session";

// "impressão" da senha atual: trocar a senha (ADMIN_PASSWORD_HASH) derruba todas as sessões abertas
export async function passwordStamp() {
  const raw = process.env.ADMIN_PASSWORD_HASH ?? "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`energyza:${raw}`));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyToken(token: string | undefined) {
  if (!token) return false;
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(s), { algorithms: ["HS256"] });
    return payload.pv === (await passwordStamp());
  } catch {
    return false;
  }
}
