import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth-edge";

const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET precisa ter 32+ caracteres");
  return new TextEncoder().encode(s);
}

// Login do único usuário (o eletricista), definido nas variáveis de ambiente.
export async function checkCredentials(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const raw = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !raw) return false;
  const hash = raw.startsWith("$2") ? raw : Buffer.from(raw, "base64").toString();
  // compara a senha sempre, para não vazar por tempo se o e-mail existe
  const passOk = await bcrypt.compare(password, hash);
  return passOk && email.trim().toLowerCase() === adminEmail;
}

export async function createSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Use no início de TODA ação/página do painel.
export async function requireAdmin() {
  const ok = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!ok) redirect("/admin/login");
}
