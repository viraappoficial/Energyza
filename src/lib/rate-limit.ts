import "server-only";
import { headers } from "next/headers";
import { sql } from "@/lib/db";

// IP de quem chamou (na Vercel o x-forwarded-for é preenchido pela própria plataforma)
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim().slice(0, 64) || "local";
}

// Janela fixa: `max` tentativas a cada `windowSec` segundos para a mesma chave. Devolve false quando passou do limite.
export async function allow(key: string, max: number, windowSec: number) {
  try {
    return await count(key, max, windowSec);
  } catch (e) {
    console.error("[rate-limit] falhou, liberando:", (e as Error).message); // problema no banco não pode trancar o dono para fora
    return true;
  }
}

async function count(key: string, max: number, windowSec: number) {
  const [row] = await sql<{ hits: number }[]>`
    insert into rate_limits (key, hits, reset_at) values (${key}, 1, now() + make_interval(secs => ${windowSec}))
    on conflict (key) do update set
      hits = case when rate_limits.reset_at <= now() then 1 else rate_limits.hits + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
    returning hits`;
  if (Math.random() < 0.02) await sql`delete from rate_limits where reset_at < now() - interval '1 day'`.catch(() => {});
  return row.hits <= max;
}

// Só consulta (sem contar): usado para saber se uma chave já estourou
export async function blocked(key: string, max: number) {
  try {
    const [row] = await sql<{ hits: number }[]>`select hits from rate_limits where key = ${key} and reset_at > now()`;
    return (row?.hits ?? 0) >= max;
  } catch {
    return false;
  }
}
