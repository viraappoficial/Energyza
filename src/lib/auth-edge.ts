import { jwtVerify } from "jose";

// Parte da sessão que o proxy usa (sem "server-only", sem cookies()).
export const SESSION_COOKIE = "energyza_session";

export async function verifyToken(token: string | undefined) {
  if (!token) return false;
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(s));
    return true;
  } catch {
    return false;
  }
}
